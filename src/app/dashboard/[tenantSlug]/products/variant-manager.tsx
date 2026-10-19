"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { errorMessage } from "@/lib/errors";

export type ManagedVariant = {
  id: string; title: string; sku: string | null; price_minor: number;
  currency: string; options: Record<string, unknown>; status: string;
};

function parseOptions(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Options must be a JSON object, for example {\"size\":\"M\"}.");
  }
  if (JSON.stringify(parsed).length > 4000) throw new Error("Variant options are too large.");
  return parsed as Record<string, unknown>;
}

export default function VariantManager({ tenantId, productId, variants }: {
  tenantId: string; productId: string; variants: ManagedVariant[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [options, setOptions] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const cleanTitle = title.trim();
      const cleanSku = sku.trim();
      const numericPrice = Number(price);
      if (!cleanTitle || cleanTitle.length > 180) throw new Error("Variant name must be 1–180 characters.");
      if (cleanSku.length > 80) throw new Error("SKU must be 80 characters or fewer.");
      if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(price.trim()) || !Number.isFinite(numericPrice) || numericPrice < 0) {
        throw new Error("Enter a valid price with up to two decimal places.");
      }
      const priceMinor = Math.round(numericPrice * 100);
      if (!Number.isSafeInteger(priceMinor)) throw new Error("Price is too large.");
      const parsedOptions = parseOptions(options);
      const supabase = createSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw new Error("Your session has expired. Sign in again.");
      const { error: rpcError } = await supabase.rpc("create_product_variant", {
        p_tenant_id: tenantId, p_product_id: productId, p_title: cleanTitle,
        p_sku: cleanSku || null, p_price_minor: priceMinor, p_options: parsedOptions
      });
      if (rpcError) throw rpcError;
      setTitle(""); setSku(""); setPrice(""); setOptions("{}");
      setMessage("Variant saved as a draft. Publish it when ready."); router.refresh();
    } catch (cause) {
      setError(errorMessage(cause, "Could not create variant."));
    } finally { setBusy(false); }
  }

  async function updateVariant(variant: ManagedVariant, status: "draft" | "published" | "archived") {
    setBusy(true); setError(""); setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw new Error("Your session has expired. Sign in again.");
      let nextTitle = variant.title;
      let nextSku = variant.sku ?? "";
      let nextPrice = (variant.price_minor / 100).toFixed(2);
      let nextOptions = JSON.stringify(variant.options ?? {});
      if (status !== "archived") {
        const titleInput = window.prompt("Variant name", nextTitle);
        if (titleInput === null) return;
        const skuInput = window.prompt("SKU (optional)", nextSku);
        if (skuInput === null) return;
        const priceInput = window.prompt("Price in KES", nextPrice);
        if (priceInput === null) return;
        const optionsInput = window.prompt("Options as JSON object", nextOptions);
        if (optionsInput === null) return;
        nextTitle = titleInput.trim(); nextSku = skuInput.trim(); nextPrice = priceInput.trim(); nextOptions = optionsInput;
      }
      if (!nextTitle || nextTitle.length > 180 || nextSku.length > 80 ||
          !/^\d{1,10}(?:\.\d{1,2})?$/.test(nextPrice) || !Number.isSafeInteger(Math.round(Number(nextPrice) * 100))) {
        throw new Error("Variant name, SKU, or price is invalid.");
      }
      const { error: rpcError } = await supabase.rpc("update_product_variant", {
        p_tenant_id: tenantId, p_product_id: productId, p_variant_id: variant.id,
        p_title: nextTitle, p_sku: nextSku || null,
        p_price_minor: Math.round(Number(nextPrice) * 100), p_options: parseOptions(nextOptions), p_status: status
      });
      if (rpcError) throw rpcError;
      setMessage(status === "archived" ? "Variant archived." : "Variant updated."); router.refresh();
    } catch (cause) {
      setError(errorMessage(cause, "Could not update variant."));
    } finally { setBusy(false); }
  }

  return <details className="variant-manager">
    <summary>Variants ({variants.length})</summary>
    <div className="variant-list">
      {variants.map(variant => <article className="variant-row" key={variant.id}>
        <div><strong>{variant.title}</strong><p>{variant.sku ? `SKU ${variant.sku} · ` : ""}{new Intl.NumberFormat("en-KE", { style: "currency", currency: variant.currency }).format(variant.price_minor / 100)}</p><span className="workspace-status">{variant.status}</span><p className="field-help">{JSON.stringify(variant.options ?? {})}</p></div>
        <div className="category-actions">
          {variant.status !== "archived" && <button className="secondary-button" type="button" disabled={busy} onClick={() => updateVariant(variant, variant.status === "published" ? "draft" : "published")}>{variant.status === "published" ? "Unpublish" : "Edit / publish"}</button>}
          {variant.status !== "archived" && <button className="secondary-button" type="button" disabled={busy} onClick={() => updateVariant(variant, "archived")}>Archive</button>}
        </div>
      </article>)}
    </div>
    <form className="product-form product-form-compact" onSubmit={submit}>
      <h3>Add variant</h3>
      <label htmlFor={`variant-title-${productId}`}>Variant name</label>
      <input id={`variant-title-${productId}`} required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 500 ml / Medium" />
      <label htmlFor={`variant-sku-${productId}`}>SKU (optional)</label>
      <input id={`variant-sku-${productId}`} maxLength={80} value={sku} onChange={e => setSku(e.target.value)} />
      <label htmlFor={`variant-price-${productId}`}>Price (KES)</label>
      <input id={`variant-price-${productId}`} required inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} />
      <label htmlFor={`variant-options-${productId}`}>Options JSON</label>
      <textarea id={`variant-options-${productId}`} rows={2} value={options} onChange={e => setOptions(e.target.value)} />
      {error && <p className="form-message error" role="alert">{error}</p>}
      {message && <p className="form-message" role="status">{message}</p>}
      <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Create draft variant"}</button>
    </form>
  </details>;
}
