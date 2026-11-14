"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, parseDelimited } from "@/lib/catalogue-import/delimited";
import {
  FIELD_LABELS, REQUIRED_FIELDS, buildImportRows, chunkRows, detectFormat, normalizeRecords, suggestMapping,
  type CanonicalField, type Mapping, type SourceFormat,
} from "@/lib/catalogue-import/rows";

type Source = "csv" | "shopify" | "woocommerce" | "google_sheets" | "url" | "json" | "other";
type Table = { headers: string[]; records: Record<string, string>[]; source: Source; note?: string };
type Summary = { created: number; updated: number; skipped: number; failed: number; stock: number; errors: { row: number; message: string }[] };

const BATCH = 200;
const FIELDS = Object.keys(FIELD_LABELS) as CanonicalField[];
const SAMPLE = "name,price,sku,category,stock,description\nMaize flour 2kg,185,MF-2KG,Groceries,40,Sifted white maize flour\nCooking oil 1L,320,OIL-1L,Groceries,24,Refined vegetable oil\n";

export default function ImportWizard({ tenantId, tenantSlug, canStock }: { tenantId: string; tenantSlug: string; canStock: boolean }) {
  const router = useRouter();
  const runRef = useRef<string | null>(null);
  const [mode, setMode] = useState<"file" | "link" | "paste">("file");
  const [link, setLink] = useState("");
  const [pasted, setPasted] = useState("");
  const [table, setTable] = useState<Table | null>(null);
  const [format, setFormat] = useState<SourceFormat>("generic");
  const [mapping, setMapping] = useState<Mapping>({});
  const [duplicates, setDuplicates] = useState<"skip" | "update">("skip");
  const [publish, setPublish] = useState(false);
  const [includeStock, setIncludeStock] = useState(canStock);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);

  function load(next: Table) {
    const detected = next.source === "shopify" || next.source === "woocommerce" ? "generic" : detectFormat(next.headers);
    const records = detected === "generic" ? next.records : normalizeRecords(detected, next.records);
    const headers = detected === "generic" ? next.headers : Object.keys(records[0] ?? {});
    setFormat(detected);
    setTable({ ...next, headers, records });
    setMapping(suggestMapping(headers));
    setSummary(null);
    setError("");
    runRef.current = null;
  }

  function fromText(text: string, source: Source) {
    const parsed = parseDelimited(text);
    if (parsed.headers.length === 0 || parsed.records.length === 0) throw new Error("No rows were found. The first row must contain column names.");
    if (parsed.records.length > MAX_IMPORT_ROWS) throw new Error(`This file has more than ${MAX_IMPORT_ROWS} rows. Split it into smaller files.`);
    load({ headers: parsed.headers, records: parsed.records, source });
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error("That file is larger than 5 MB.");
      if (/\.xlsx?$/i.test(file.name)) throw new Error("Excel files are not read directly. In Excel choose File → Save As → CSV, then upload that file.");
      const text = await file.text();
      if (/\.json$/i.test(file.name) || text.trimStart().startsWith("[") || text.trimStart().startsWith("{")) {
        throw new Error("For JSON, host the file and use the link option, or convert it to CSV.");
      }
      fromText(text, "csv");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not read that file."); }
  }

  async function onLink() {
    setBusy(true); setError(""); setProgress("Reading that link…");
    try {
      const response = await fetch(`/api/tenants/${encodeURIComponent(tenantSlug)}/catalogue-import/fetch`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: link.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Could not read that link.");
      load({ headers: body.headers, records: body.records, source: body.sourceKind, note: body.note });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not read that link."); }
    finally { setBusy(false); setProgress(""); }
  }

  const built = useMemo(() => table ? buildImportRows(table.records, mapping, { publish, includeStock: includeStock && canStock }) : null, [table, mapping, publish, includeStock, canStock]);
  const missing = REQUIRED_FIELDS.filter(field => !mapping[field]);

  async function runImport() {
    if (!built || !table || built.rows.length === 0) return;
    setBusy(true); setError(""); setSummary(null);
    runRef.current ??= crypto.randomUUID();
    const totals: Summary = { created: 0, updated: 0, skipped: 0, failed: 0, stock: 0, errors: [] };
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) { router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`); return; }
      const source = table.source === "csv" || table.source === "shopify" || table.source === "woocommerce" || table.source === "google_sheets" || table.source === "url" || table.source === "json" ? table.source : "other";
      const chunks = chunkRows(built.rows, BATCH);
      for (let i = 0; i < chunks.length; i += 1) {
        setProgress(`Importing batch ${i + 1} of ${chunks.length}…`);
        const { data, error: rpcError } = await supabase.rpc("import_catalogue_rows", {
          p_tenant_id: tenantId, p_rows: chunks[i], p_duplicate_mode: duplicates, p_source: source,
          p_import_key: `${runRef.current}-${i}`, p_location_id: null,
        });
        if (rpcError) throw new Error(`${rpcError.message}${totals.created + totals.updated > 0 ? " Already-imported batches are kept; press Import again to retry safely." : ""}`);
        const result = data as { created: number; updated: number; skipped: number; failed: number; stock_applied: number; errors: { row: number; message: string }[] };
        totals.created += result.created; totals.updated += result.updated; totals.skipped += result.skipped; totals.failed += result.failed; totals.stock += result.stock_applied;
        totals.errors.push(...result.errors.map(e => ({ row: e.row + i * BATCH, message: e.message })));
      }
      setSummary(totals);
      runRef.current = null;
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Import failed."); }
    finally { setBusy(false); setProgress(""); }
  }

  const sampleHref = `data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE)}`;

  return (
    <div className="wizard-grid">
      <section className="product-form wizard-source">
        <h2>1. Source</h2>
        <div role="tablist" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {([["file", "File"], ["link", "Link / store"], ["paste", "Paste"]] as const).map(([key, label]) =>
            <button key={key} type="button" role="tab" aria-selected={mode === key} className={mode === key ? "primary-button" : "secondary-button"} onClick={() => setMode(key)}>{label}</button>)}
        </div>
        {mode === "file" && <>
          <label htmlFor="import-file">CSV file</label>
          <input id="import-file" type="file" accept=".csv,.tsv,.txt,text/csv" onChange={onFile} />
          <p className="field-help">Max {MAX_IMPORT_ROWS.toLocaleString()} rows · 5 MB · <a href={sampleHref} download="catalogue-sample.csv">Sample file</a></p>
        </>}
        {mode === "link" && <>
          <label htmlFor="import-link">Sheets, CSV, Shopify or WooCommerce link</label>
          <input id="import-link" type="url" inputMode="url" placeholder="https://yourstore.co.ke" value={link} onChange={e => setLink(e.target.value)} />
          <p className="field-help">Sheets must be viewable by anyone with the link.</p>
          <button className="primary-button" type="button" disabled={busy || link.trim().length < 8} onClick={onLink}>{busy ? "Reading…" : "Read this link"}</button>
        </>}
        {mode === "paste" && <>
          <label htmlFor="import-paste">Paste rows (first row = column names)</label>
          <textarea id="import-paste" rows={6} value={pasted} onChange={e => setPasted(e.target.value)} />
          <button className="primary-button" type="button" disabled={!pasted.trim()} onClick={() => { try { fromText(pasted, "csv"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not read that."); } }}>Read pasted rows</button>
        </>}
        {error && <p className="form-message error" role="alert">{error}</p>}
        {progress && !table && <p className="form-message" role="status">{progress}</p>}
      </section>

      {table && built && <section className="product-form">
        <h2>2. Columns</h2>
        <p className="auth-description">{table.records.length.toLocaleString()} rows{format !== "generic" ? ` · ${format === "shopify" ? "Shopify" : "WooCommerce"}` : ""}{table.note ? ` · ${table.note}` : ""}</p>
        <div className="map-grid">{FIELDS.map(field => <div key={field}>
          <label htmlFor={`map-${field}`}>{FIELD_LABELS[field]}{REQUIRED_FIELDS.includes(field) ? " (required)" : ""}</label>
          <select id={`map-${field}`} value={mapping[field] ?? ""} onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value || undefined }))}>
            <option value="">{REQUIRED_FIELDS.includes(field) ? "Choose a column" : "Don’t import"}</option>
            {table.headers.map(header => <option key={header} value={header}>{header}</option>)}
          </select>
        </div>)}</div>
        <label htmlFor="dup-mode">Existing products (same SKU or slug)</label>
        <select id="dup-mode" value={duplicates} onChange={e => setDuplicates(e.target.value as "skip" | "update")}>
          <option value="skip">Skip</option>
          <option value="update">Update name, description, category, price</option>
        </select>
        <label><input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} style={{ width: "auto", marginRight: 8 }} />Publish immediately (otherwise drafts)</label>
        {canStock
          ? <label><input type="checkbox" checked={includeStock} onChange={e => setIncludeStock(e.target.checked)} style={{ width: "auto", marginRight: 8 }} />Import opening stock</label>
          : <p className="field-help">Your role can’t import stock.</p>}
      </section>}

      {table && built && <section className="product-form">
        <h2>3. Import</h2>
        {missing.length > 0 && <p className="form-message error" role="alert">Choose a column for: {missing.map(f => FIELD_LABELS[f]).join(", ")}.</p>}
        {missing.length === 0 && <p className="form-message" role="status">{built.rows.length.toLocaleString()} ready{built.issues.length ? ` · ${built.issues.length} skipped` : ""}{built.ignored ? ` · ${built.ignored} blank` : ""} · prices in KES</p>}
        {missing.length === 0 && built.rows.slice(0, 8).map((row, index) => <p key={index} className="field-help"><strong>{row.title}</strong> · KES {(row.price_minor / 100).toLocaleString("en-KE", { minimumFractionDigits: 2 })}{row.sku ? ` · ${row.sku}` : ""}{row.category ? ` · ${row.category}` : ""}{row.stock ? ` · ${row.stock} in stock` : ""}</p>)}
        {missing.length === 0 && built.issues.length > 0 && <details><summary>Skipped rows</summary>{built.issues.slice(0, 50).map((issue, index) => <p key={index} className="field-help">Row {issue.row}: {issue.message}</p>)}{built.issues.length > 50 && <p className="field-help">…and {built.issues.length - 50} more.</p>}</details>}
        {summary && <div className="form-message" role="status">
          <p><strong>Done.</strong> {summary.created} created · {summary.updated} updated · {summary.skipped} skipped · {summary.failed} failed{summary.stock ? ` · opening stock recorded for ${summary.stock}` : ""}.</p>
          {summary.errors.slice(0, 20).map((e, i) => <p key={i} className="field-help">Batch row {e.row}: {e.message}</p>)}
        </div>}
        {progress && table && <p className="form-message" role="status">{progress}</p>}
        <button className="primary-button" type="button" disabled={busy || missing.length > 0 || built.rows.length === 0} onClick={runImport}>{busy ? "Importing…" : `Import ${built.rows.length.toLocaleString()} products`}</button>
      </section>}
    </div>
  );
}
