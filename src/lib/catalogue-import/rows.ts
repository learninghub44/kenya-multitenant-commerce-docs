/**
 * Turns parsed tables (CSV, Shopify, WooCommerce, JSON, Sheets) into the row shape accepted by the
 * `import_catalogue_rows` Postgres function. The database re-validates everything; this module exists
 * for previews, column mapping and friendly per-row messages. Money is handled as integer cents, never floats.
 */

export type CanonicalField = "title" | "slug" | "description" | "sku" | "price" | "category" | "stock" | "variant" | "status";
export type Mapping = Partial<Record<CanonicalField, string>>;
export type SourceFormat = "shopify" | "woocommerce" | "generic";

export type ImportRow = {
  title: string;
  slug: string;
  description: string;
  sku: string | null;
  price_minor: number;
  category: string | null;
  stock: number | null;
  status: "draft" | "published";
  variant_title: string;
  options: Record<string, string>;
};
export type RowIssue = { row: number; message: string };
export type BuildOptions = { publish: boolean; includeStock: boolean };
export type BuildResult = { rows: ImportRow[]; issues: RowIssue[]; ignored: number };

export const FIELD_LABELS: Record<CanonicalField, string> = {
  title: "Product name", slug: "URL slug", description: "Description", sku: "SKU",
  price: "Selling price (KES)", category: "Category", stock: "Opening stock", variant: "Variant / option", status: "Status",
};
export const REQUIRED_FIELDS: CanonicalField[] = ["title", "price"];

const ALIASES: Record<CanonicalField, string[]> = {
  title: ["title", "name", "product name", "product", "item", "item name", "product title"],
  slug: ["slug", "handle", "url slug", "permalink"],
  description: ["description", "body (html)", "body", "details", "short description", "product description"],
  sku: ["sku", "variant sku", "item code", "code", "barcode", "product code"],
  price: ["price", "variant price", "regular price", "selling price", "unit price", "retail price", "sale price", "amount", "price (kes)"],
  category: ["category", "categories", "type", "product type", "product category", "department", "collection"],
  stock: ["stock", "quantity", "qty", "inventory", "on hand", "stock quantity", "variant inventory qty", "opening stock", "in stock?"],
  variant: ["variant", "variant title", "option", "option1 value", "size", "attribute 1 value(s)"],
  status: ["status", "published", "state"],
};

const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export function detectFormat(headers: string[]): SourceFormat {
  const set = new Set(headers.map(norm));
  if (set.has("handle") && (set.has("variant price") || set.has("option1 value") || set.has("body (html)"))) return "shopify";
  if (set.has("regular price") || (set.has("type") && set.has("sku") && (set.has("categories") || set.has("parent")))) return "woocommerce";
  return "generic";
}

export function suggestMapping(headers: string[]): Mapping {
  const mapping: Mapping = {};
  const used = new Set<string>();
  (Object.keys(ALIASES) as CanonicalField[]).forEach(field => {
    for (const alias of ALIASES[field]) {
      const hit = headers.find(h => norm(h) === alias && !used.has(h));
      if (hit) { mapping[field] = hit; used.add(hit); break; }
    }
  });
  return mapping;
}

/** "KES 1,250.50", "Ksh1250", "1 250,5" -> 125050 (integer cents). Returns null if unusable. */
export function parseMoneyToMinor(input: string): number | null {
  let text = input.trim().replace(/^(?:kes|ksh|kshs|k\.?sh\.?s?)\s*/i, "").replace(/[\s\u00A0]/g, "");
  if (!text || /[^0-9.,]/.test(text)) return null;
  const lastDot = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    // The later separator is the decimal mark; the other is thousands.
    if (lastComma > lastDot) text = text.replace(/\./g, "").replace(",", ".");
    else text = text.replace(/,/g, "");
  } else if (lastComma >= 0) {
    if (/^\d{1,3}(?:,\d{3})+$/.test(text)) text = text.replace(/,/g, "");
    else if (/^\d+,\d{1,2}$/.test(text)) text = text.replace(",", ".");
    else return null;
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  if (whole.length > 10) return null;
  const minor = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isSafeInteger(minor) ? minor : null;
}

export function slugify(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180).replace(/-+$/g, "");
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ", "&apos;": "'" };
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp|apos);/g, entity => ENTITIES[entity] ?? entity)
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function parseStock(value: string): number | null {
  const text = value.trim().replace(/,/g, "");
  if (!text) return null;
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return n <= 100000000 ? n : null;
}

function leafCategory(raw: string): string | null {
  // WooCommerce: "Clothing > Shirts, Sale" -> "Shirts". Shopify type is already a single label.
  const first = raw.split(",")[0]?.trim() ?? "";
  const leaf = first.split(">").pop()?.trim() ?? "";
  return leaf ? leaf.slice(0, 100) : null;
}

function isFalse(value: string) { return ["0", "false", "no", "draft", "private", "archived", "unpublished"].includes(norm(value)); }

/**
 * Shopify exports repeat one product over many rows (Handle shared, Title blank on variant rows).
 * Woo exports list variable parents plus variation rows. Both are flattened here so each saleable variant
 * becomes its own catalogue product (title "Shirt (Red / M)"). Known limitation, see docs/32-catalogue-import.md.
 */
export function normalizeRecords(format: SourceFormat, records: Record<string, string>[]): Record<string, string>[] {
  if (format === "shopify") {
    const out: Record<string, string>[] = [];
    let current: Record<string, string> | null = null;
    for (const record of records) {
      const get = (key: string) => record[key] ?? "";
      if (get("Title")) current = record;
      const base = current ?? record;
      const options = [get("Option1 Value"), get("Option2 Value"), get("Option3 Value")].filter(v => v && v !== "Default Title");
      const baseTitle = base["Title"] ?? "";
      out.push({
        title: options.length ? `${baseTitle} (${options.join(" / ")})` : baseTitle,
        slug: options.length ? `${base["Handle"] ?? ""}-${options.join("-")}` : base["Handle"] ?? "",
        description: base["Body (HTML)"] ?? "",
        sku: get("Variant SKU"),
        price: get("Variant Price"),
        category: base["Product Category"] || base["Type"] || "",
        stock: get("Variant Inventory Qty"),
        variant: options.join(" / "),
        status: base["Status"] ?? "",
      });
    }
    return out;
  }
  if (format === "woocommerce") {
    const out: Record<string, string>[] = [];
    for (const record of records) {
      const type = norm(record["Type"] ?? "");
      const price = record["Regular price"] || record["Sale price"] || "";
      if (type === "variable" && !price) continue; // parent container; its variations carry the prices
      out.push({
        title: record["Name"] ?? "",
        slug: "",
        description: record["Description"] || record["Short description"] || "",
        sku: record["SKU"] ?? "",
        price: record["Regular price"] || record["Sale price"] || "",
        category: record["Categories"] ?? "",
        stock: record["Stock"] ?? "",
        variant: "",
        status: record["Published"] ?? "",
      });
    }
    return out;
  }
  return records;
}

export function buildImportRows(
  records: Record<string, string>[],
  mapping: Mapping,
  options: BuildOptions,
): BuildResult {
  const rows: ImportRow[] = [];
  const issues: RowIssue[] = [];
  const usedSlugs = new Set<string>();
  const usedSkus = new Set<string>();
  let ignored = 0;

  const cell = (record: Record<string, string>, field: CanonicalField) => {
    const header = mapping[field];
    return header ? (record[header] ?? "").trim() : "";
  };

  records.forEach((record, index) => {
    const rowNumber = index + 2; // header is row 1 in a spreadsheet
    const title = cell(record, "title");
    const priceText = cell(record, "price");
    if (!title && !priceText && !cell(record, "sku")) { ignored += 1; return; }
    if (!title) { issues.push({ row: rowNumber, message: "Missing product name" }); return; }
    if (title.length > 180) { issues.push({ row: rowNumber, message: "Product name is longer than 180 characters" }); return; }
    const priceMinor = parseMoneyToMinor(priceText);
    if (priceMinor === null) { issues.push({ row: rowNumber, message: priceText ? `Price "${priceText}" is not a valid amount` : "Missing price" }); return; }
    if (priceMinor > 1000000000000) { issues.push({ row: rowNumber, message: "Price is too large" }); return; }

    const sku: string | null = cell(record, "sku") || null;
    if (sku && sku.length > 80) { issues.push({ row: rowNumber, message: "SKU is longer than 80 characters" }); return; }
    if (sku) {
      const key = sku.toUpperCase();
      if (usedSkus.has(key)) { issues.push({ row: rowNumber, message: `SKU ${sku} appears more than once in this file` }); return; }
      usedSkus.add(key);
    }

    let slug = slugify(cell(record, "slug") || title);
    if (!slug) slug = sku ? slugify(sku) : "";
    if (!slug) { issues.push({ row: rowNumber, message: "Could not build a URL slug from this name" }); return; }
    const baseSlug = slug;
    for (let n = 2; usedSlugs.has(slug); n += 1) slug = `${baseSlug.slice(0, 170)}-${n}`;
    usedSlugs.add(slug);

    const rawStatus = cell(record, "status");
    const wantsPublished = options.publish && !(rawStatus && isFalse(rawStatus));
    const stockText = cell(record, "stock");
    const stock = options.includeStock ? parseStock(stockText) : null;
    if (options.includeStock && stockText && stock === null) issues.push({ row: rowNumber, message: `Stock "${stockText}" is not a whole number; imported without opening stock` });

    const variantText = cell(record, "variant");
    rows.push({
      title,
      slug,
      description: htmlToText(cell(record, "description")).slice(0, 10000),
      sku,
      price_minor: priceMinor,
      category: cell(record, "category") ? leafCategory(cell(record, "category")) : null,
      stock,
      status: wantsPublished ? "published" : "draft",
      variant_title: variantText ? variantText.slice(0, 180) : "Default",
      options: variantText ? { Option: variantText.slice(0, 100) } : {},
    });
  });
  return { rows, issues, ignored };
}

export function chunkRows<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
}
