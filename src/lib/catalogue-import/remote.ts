/**
 * Fetches a catalogue from a public URL on behalf of a signed-in merchant.
 * Supported: Google Sheets share links, direct CSV/TSV/JSON files, Shopify stores (public /products.json),
 * and WooCommerce stores (public Store API). The result is a plain table the wizard can map and preview.
 *
 * SSRF posture: https only, port 443 only, no IP literals / localhost / internal suffixes, redirects are followed
 * manually and every hop is re-validated, hard timeout and byte cap. DNS rebinding cannot be fully excluded from
 * application code, so the Worker/host must also not have private-network egress (true on Cloudflare Workers).
 */
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, parseDelimited } from "./delimited.ts";
import type { SourceFormat } from "./rows.ts";

export type RemoteTable = { format: SourceFormat; sourceKind: "csv" | "shopify" | "woocommerce" | "google_sheets" | "json" | "url"; headers: string[]; records: Record<string, string>[]; note?: string };

export class RemoteImportError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

const BLOCKED_SUFFIXES = [".local", ".localhost", ".internal", ".lan", ".home", ".corp", ".intranet"];
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

export function assertPublicHttpsUrl(raw: string): URL {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { throw new RemoteImportError("Enter a valid link starting with https://"); }
  if (url.protocol !== "https:") throw new RemoteImportError("Only secure https:// links can be imported.");
  if (url.username || url.password) throw new RemoteImportError("Links with embedded credentials are not allowed.");
  if (url.port && url.port !== "443") throw new RemoteImportError("Only standard https links (port 443) can be imported.");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") || host === "localhost" || BLOCKED_SUFFIXES.some(s => host.endsWith(s))) throw new RemoteImportError("That address is not a public website.");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":") || /^\[/.test(host) || /^\d+$/.test(host) || /^0x/i.test(host)) throw new RemoteImportError("IP addresses are not allowed. Use the website name.");
  return url;
}

export function googleSheetsCsvUrl(url: URL): string | null {
  if (url.hostname !== "docs.google.com") return null;
  const match = url.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/);
  if (!match) return null;
  const gid = url.searchParams.get("gid") ?? (url.hash.match(/gid=(\d+)/)?.[1] ?? "0");
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${encodeURIComponent(/^\d+$/.test(gid) ? gid : "0")}`;
}

async function readCapped(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_IMPORT_BYTES) throw new RemoteImportError("That file is larger than 5 MB.", 413);
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_IMPORT_BYTES) { await reader.cancel(); throw new RemoteImportError("That file is larger than 5 MB.", 413); }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8").decode(merged);
}

async function safeFetch(startUrl: string, accept: string): Promise<{ text: string; contentType: string }> {
  let current = assertPublicHttpsUrl(startUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(current.toString(), {
        redirect: "manual", signal: controller.signal,
        headers: { accept, "user-agent": "CatalogueImport/1.0 (+merchant-initiated)" },
      });
    } catch {
      throw new RemoteImportError("Could not reach that link. Check it is public and try again.", 502);
    } finally { clearTimeout(timer); }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new RemoteImportError("That link redirected without a destination.", 502);
      current = assertPublicHttpsUrl(new URL(location, current).toString());
      continue;
    }
    if (response.status === 401 || response.status === 403) throw new RemoteImportError("That link is private. Make it public (or share \"anyone with the link\") and try again.", 422);
    if (response.status === 404) throw new RemoteImportError("Nothing was found at that link.", 422);
    if (!response.ok) throw new RemoteImportError(`That site answered with an error (${response.status}).`, 502);
    return { text: await readCapped(response), contentType: response.headers.get("content-type") ?? "" };
  }
  throw new RemoteImportError("That link redirected too many times.", 502);
}

type Rec = Record<string, string>;
const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const SHOPIFY_HEADERS = ["title", "slug", "description", "sku", "price", "category", "stock", "variant", "status"];

async function fetchShopify(origin: string): Promise<RemoteTable | null> {
  const records: Rec[] = [];
  for (let page = 1; page <= 8 && records.length < MAX_IMPORT_ROWS; page += 1) {
    let text: string;
    try { ({ text } = await safeFetch(`${origin}/products.json?limit=250&page=${page}`, "application/json")); } catch (error) {
      if (page === 1) return null;
      throw error;
    }
    let data: unknown;
    try { data = JSON.parse(text); } catch { return page === 1 ? null : { format: "generic", sourceKind: "shopify", headers: SHOPIFY_HEADERS, records }; }
    const products = (data as { products?: unknown }).products;
    if (!Array.isArray(products)) return page === 1 ? null : { format: "generic", sourceKind: "shopify", headers: SHOPIFY_HEADERS, records };
    if (products.length === 0) break;
    for (const product of products as Record<string, unknown>[]) {
      const variants = Array.isArray(product.variants) ? (product.variants as Record<string, unknown>[]) : [];
      for (const variant of variants) {
        const variantTitle = str(variant.title);
        const named = variantTitle && variantTitle !== "Default Title" ? variantTitle : "";
        records.push({
          title: named ? `${str(product.title)} (${named})` : str(product.title),
          slug: named ? `${str(product.handle)}-${named}` : str(product.handle),
          description: str(product.body_html),
          sku: str(variant.sku),
          price: str(variant.price),
          category: str(product.product_type),
          stock: "", // Shopify's public feed does not expose stock levels
          variant: named,
          status: "",
        });
      }
    }
  }
  if (records.length === 0) return null;
  return { format: "generic", sourceKind: "shopify", headers: SHOPIFY_HEADERS, records: records.slice(0, MAX_IMPORT_ROWS), note: "Shopify's public product feed does not include stock levels or the full image set. Prices are read as KES." };
}

async function fetchWoo(origin: string): Promise<RemoteTable | null> {
  const records: Rec[] = [];
  for (let page = 1; page <= 20 && records.length < MAX_IMPORT_ROWS; page += 1) {
    let text: string;
    try { ({ text } = await safeFetch(`${origin}/wp-json/wc/store/v1/products?per_page=100&page=${page}`, "application/json")); } catch (error) {
      if (page === 1) return null;
      throw error;
    }
    let data: unknown;
    try { data = JSON.parse(text); } catch { return null; }
    if (!Array.isArray(data)) return null;
    if (data.length === 0) break;
    for (const item of data as Record<string, unknown>[]) {
      const prices = (item.prices ?? {}) as Record<string, unknown>;
      const currency = str(prices.currency_code).toUpperCase();
      if (currency && currency !== "KES") throw new RemoteImportError(`This store sells in ${currency}. Only KES catalogues can be imported.`, 422);
      const minorUnit = Number(prices.currency_minor_unit ?? 2);
      const raw = str(prices.regular_price) || str(prices.price);
      let price = "";
      if (/^\d+$/.test(raw) && Number.isInteger(minorUnit) && minorUnit >= 0 && minorUnit <= 4) {
        const padded = raw.padStart(minorUnit + 1, "0");
        price = minorUnit === 0 ? padded : `${padded.slice(0, -minorUnit)}.${padded.slice(-minorUnit)}`;
      }
      const cats = Array.isArray(item.categories) ? (item.categories as Record<string, unknown>[]) : [];
      records.push({
        title: str(item.name), slug: str(item.slug), description: str(item.description) || str(item.short_description),
        sku: str(item.sku), price, category: str(cats[0]?.name), stock: "", variant: "", status: "",
      });
    }
  }
  if (records.length === 0) return null;
  return { format: "generic", sourceKind: "woocommerce", headers: SHOPIFY_HEADERS, records: records.slice(0, MAX_IMPORT_ROWS), note: "WooCommerce's public feed does not include stock counts. Variable products appear as one entry." };
}

function jsonToTable(data: unknown): RemoteTable | null {
  const list = Array.isArray(data) ? data : Array.isArray((data as { products?: unknown })?.products) ? (data as { products: unknown[] }).products
    : Array.isArray((data as { items?: unknown })?.items) ? (data as { items: unknown[] }).items : null;
  if (!list || list.length === 0) return null;
  const headerSet = new Set<string>();
  const records: Rec[] = [];
  for (const entry of list.slice(0, MAX_IMPORT_ROWS)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const rec: Rec = {};
    for (const [key, value] of Object.entries(entry as Record<string, unknown>)) {
      if (value === null || typeof value === "object") continue;
      rec[key.slice(0, 80)] = String(value);
      headerSet.add(key.slice(0, 80));
    }
    records.push(rec);
  }
  return records.length ? { format: "generic", sourceKind: "json", headers: [...headerSet], records } : null;
}

export function tableFromText(text: string, contentType: string, sourceKind: RemoteTable["sourceKind"]): RemoteTable {
  const trimmed = text.trimStart();
  if (contentType.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let data: unknown;
    try { data = JSON.parse(text); } catch { throw new RemoteImportError("That link looks like JSON but could not be read.", 422); }
    const table = jsonToTable(data);
    if (!table) throw new RemoteImportError("No product list was found in that JSON file.", 422);
    return { ...table, sourceKind: sourceKind === "url" ? "json" : sourceKind };
  }
  if (/^\s*<(?:!doctype|html)/i.test(text)) throw new RemoteImportError("That link opened a web page, not a data file. Use a CSV link, a Google Sheets share link, or a store address.", 422);
  const parsed = parseDelimited(text);
  if (parsed.headers.length === 0 || parsed.records.length === 0) throw new RemoteImportError("No rows were found in that file.", 422);
  return { format: "generic", sourceKind, headers: parsed.headers, records: parsed.records.slice(0, MAX_IMPORT_ROWS) };
}

export async function fetchRemoteCatalogue(rawUrl: string): Promise<RemoteTable> {
  const url = assertPublicHttpsUrl(rawUrl);

  const sheets = googleSheetsCsvUrl(url);
  if (sheets) {
    const { text, contentType } = await safeFetch(sheets, "text/csv");
    return tableFromText(text, contentType, "google_sheets");
  }

  const looksLikeFile = /\.(csv|tsv|txt|json)$/i.test(url.pathname) || url.pathname.includes("/export");
  if (looksLikeFile) {
    const { text, contentType } = await safeFetch(url.toString(), "text/csv,application/json,text/plain");
    return tableFromText(text, contentType, "url");
  }

  // Treat as a store address: try Shopify first, then WooCommerce.
  const origin = url.origin;
  const shopify = await fetchShopify(origin);
  if (shopify) return shopify;
  const woo = await fetchWoo(origin);
  if (woo) return woo;
  throw new RemoteImportError("Could not find a product feed at that address. Try a CSV export, a Google Sheets link, or a Shopify/WooCommerce store address.", 422);
}
