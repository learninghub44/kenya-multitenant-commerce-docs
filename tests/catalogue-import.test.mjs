import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDelimited } from "../src/lib/catalogue-import/delimited.ts";
import { buildImportRows, detectFormat, normalizeRecords, parseMoneyToMinor, suggestMapping, htmlToText } from "../src/lib/catalogue-import/rows.ts";
import { assertPublicHttpsUrl, googleSheetsCsvUrl, tableFromText } from "../src/lib/catalogue-import/remote.ts";

test("parses quoted fields, embedded commas/newlines, BOM and semicolons", () => {
  const t = parseDelimited('\uFEFFname;price\r\n"Tea, loose";"1,250"\r\n"Two\nlines";99\r\n');
  assert.equal(t.delimiter, ";");
  assert.deepEqual(t.records, [{ name: "Tea, loose", price: "1,250" }, { name: "Two\nlines", price: "99" }]);
});

test("money is parsed to integer cents without floats", () => {
  const cases = [["1250", 125000], ["KES 1,250.50", 125050], ["Ksh1250", 125000], ["1.250,5", 125050], ["0.1", 10], ["19.99", 1999], ["0", 0]];
  for (const [input, expected] of cases) assert.equal(parseMoneyToMinor(input), expected, input);
  for (const bad of ["", "abc", "-5", "1.2345", "1.250", "12,34,56", "99999999999"]) assert.equal(parseMoneyToMinor(bad), null, bad);
});

test("generic CSV maps columns, dedupes slugs and reports bad rows", () => {
  const { headers, records } = parseDelimited("Name,Price,SKU,Stock\nMaize,185,A1,10\nMaize,190,A2,x\n,5,A3,1\nBeans,abc,A4,1\nRice,100,A1,1\n,,,\n");
  const out = buildImportRows(records, suggestMapping(headers), { publish: false, includeStock: true });
  assert.deepEqual(out.rows.map(r => r.slug), ["maize", "maize-2"]);
  assert.equal(out.rows[0].stock, 10);
  assert.equal(out.rows[1].stock, null);
  assert.equal(out.ignored, 0); // fully blank rows are already dropped by the parser
  const messages = out.issues.map(i => i.message).join("|");
  assert.match(messages, /Missing product name/);
  assert.match(messages, /not a valid amount/);
  assert.match(messages, /SKU A1 appears more than once/);
  assert.ok(out.rows.every(r => r.status === "draft"));
});

test("publish option never publishes rows flagged as draft/unpublished", () => {
  const records = [{ n: "A", p: "1", s: "active" }, { n: "B", p: "1", s: "draft" }];
  const rows = buildImportRows(records, { title: "n", price: "p", status: "s" }, { publish: true, includeStock: false }).rows;
  assert.deepEqual(rows.map(r => r.status), ["published", "draft"]);
});

test("Shopify export: variant rows are flattened and html is stripped", () => {
  const csv = 'Handle,Title,Body (HTML),Type,Option1 Value,Variant SKU,Variant Price,Variant Inventory Qty,Status\ntee,Tee,"<p>Soft &amp; warm</p>",Shirts,S,T-S,1200,5,active\ntee,,,,M,T-M,1200,7,\nmug,Mug,,Home,Default Title,MUG,350,3,active\n';
  const { headers, records } = parseDelimited(csv);
  assert.equal(detectFormat(headers), "shopify");
  const flat = normalizeRecords("shopify", records);
  const { rows } = buildImportRows(flat, suggestMapping(Object.keys(flat[0])), { publish: false, includeStock: true });
  assert.deepEqual(rows.map(r => r.title), ["Tee (S)", "Tee (M)", "Mug"]);
  assert.equal(rows[0].description, "Soft & warm");
  assert.equal(rows[1].category, "Shirts");
  assert.equal(rows[1].stock, 7);
});

test("WooCommerce export: variable parents skipped, category leaf used", () => {
  const csv = "Type,SKU,Name,Published,Regular price,Categories,Stock\nvariable,P,Shirt,1,,\"Clothing > Shirts\",\nvariation,P-1,Shirt - Red,1,800,\"Clothing > Shirts\",4\nsimple,Q,Mug,1,300,\"Home, Sale\",2\n";
  const { headers, records } = parseDelimited(csv);
  assert.equal(detectFormat(headers), "woocommerce");
  const flat = normalizeRecords("woocommerce", records);
  const { rows } = buildImportRows(flat, suggestMapping(Object.keys(flat[0])), { publish: false, includeStock: true });
  assert.deepEqual(rows.map(r => [r.title, r.category]), [["Shirt - Red", "Shirts"], ["Mug", "Home"]]);
});

test("htmlToText strips tags", () => assert.equal(htmlToText("<p>a</p><p>b<br>c</p>"), "a\nb\nc"));

test("remote import refuses non-public or unsafe addresses", () => {
  for (const bad of ["http://example.com/a.csv", "https://localhost/x", "https://127.0.0.1/x", "https://169.254.169.254/latest", "https://[::1]/x", "https://2130706433/x", "https://printer.local/x", "https://svc.internal/x", "https://user:pw@example.com/x", "https://example.com:8443/x", "https://intranet/x", "ftp://example.com"]) {
    assert.throws(() => assertPublicHttpsUrl(bad), undefined, bad);
  }
  assert.equal(assertPublicHttpsUrl("https://shop.example.co.ke/").hostname, "shop.example.co.ke");
});

test("Google Sheets links become CSV export links on docs.google.com only", () => {
  const id = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
  assert.equal(googleSheetsCsvUrl(new URL(`https://docs.google.com/spreadsheets/d/${id}/edit?gid=42#gid=42`)), `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=42`);
  assert.equal(googleSheetsCsvUrl(new URL(`https://evil.example.com/spreadsheets/d/${id}/edit`)), null);
});

test("remote text: HTML pages are rejected, JSON product lists are accepted", () => {
  assert.throws(() => tableFromText("<!doctype html><html>", "text/html", "url"));
  const t = tableFromText(JSON.stringify({ products: [{ name: "A", price: 5, tags: ["x"] }] }), "application/json", "url");
  assert.deepEqual(t.headers, ["name", "price"]);
});

// --- database function guarantees (static checks on the migration) ---
const sql = readFileSync(new URL("../supabase/migrations/202611130002_catalogue_import.sql", import.meta.url), "utf8");
test("import RPC checks authentication and tenant role in the database", () => {
  assert.match(sql, /auth\.uid\(\) is null/);
  assert.match(sql, /has_tenant_role\(p_tenant_id, array\['owner','manager','catalog_editor'\]/);
});
test("import RPC is idempotent per key and ledger-writes opening stock behind a stock role check", () => {
  assert.match(sql, /unique \(tenant_id, import_key\)/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /can_stock := public\.has_tenant_role\(p_tenant_id, array\['owner','manager','stock_clerk'\]/);
  assert.match(sql, /insert into public\.inventory_movements/);
  assert.match(sql, /'opening'/);
});
test("import RPC is not callable by anon and history is read-only for clients", () => {
  assert.match(sql, /revoke all on function public\.import_catalogue_rows\([^)]*\) from public, anon/);
  assert.match(sql, /revoke insert, update, delete on public\.catalogue_imports from anon, authenticated/);
});
