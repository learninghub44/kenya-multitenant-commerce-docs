"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ProductEditor({
  tenantId, productId, variantId, initialTitle, initialSlug, initialDescription, initialPriceMinor, initialSku, initialStatus
}: {
  tenantId: string;
  productId: string;
  variantId: string;
  initialTitle: string;
  initialSlug: string;
  initialDescription: string;
  initialPriceMinor: number;
  initialSku: string | null;
  initialStatus: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [description, setDescription] = useState(initialDescription);
  const [price, setPrice] = useState((initialPriceMinor / 100).toFixed(2));
  const [sku, setSku] = useState(initialSku ?? "");
  const [status, setStatus] = useState<"draft" | "published">(initialStatus === "published" ? "published" : "draft");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const cleanTitle = title.trim();
      const cleanSlug = slug.toLowerCase().trim();
      const numericPrice = Number(price);
      if (!cleanTitle || cleanTitle.length > 180) throw new Error("Enter a product name up to 180 characters.");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug) || cleanSlug.length > 180) throw new Error("Use a valid URL slug with lowercase letters, numbers and hyphens.");
      if (!Number.isFinite(numericPrice) || numericPrice < 0 || !/^\d{1,10}(?:\.\d{1,2})?$/.test(price.trim())) throw new Error("Enter a valid price with up to two decimal places.");
      const priceMinor = Math.round(numericPrice * 100);
      if (!Number.isSafeInteger(priceMinor)) throw new Error("Price is too large.");
      if (description.length > 10000) throw new Error("Description must be 10,000 characters or fewer.");
      if (sku.trim().length > 80) throw new Error("SKU must be 80 characters or fewer.");

      const supabase = createSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Your session has expired. Sign in again.");
      const { error: rpcError } = await supabase.rpc("update_product_with_default_variant", {
        p_tenant_id: tenantId,
        p_product_id: productId,
        p_variant_id: variantId,
        p_title: cleanTitle,
        p_slug: cleanSlug,
        p_description: description.trim(),
        p_price_minor: priceMinor,
        p_sku: sku.trim() || null,
        p_status: status
      });
      if (rpcError) throw rpcError;
      setSuccess(status === "published" ? "Product saved with published status. Public storefront routing is not enabled yet." : "Product saved as a draft.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="product-editor">
      <summary>Edit product</summary>
      <form className="product-form product-form-compact" onSubmit={submit}>
        <label htmlFor={`edit-title-${productId}`}>Product name</label>
        <input id={`edit-title-${productId}`} required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} />
        <label htmlFor={`edit-slug-${productId}`}>URL slug</label>
        <input id={`edit-slug-${productId}`} required maxLength={180} value={slug} onChange={e => setSlug(e.target.value)} />
        <label htmlFor={`edit-price-${productId}`}>Selling price (KES)</label>
        <input id={`edit-price-${productId}`} inputMode="decimal" required value={price} onChange={e => setPrice(e.target.value)} />
        <label htmlFor={`edit-sku-${productId}`}>SKU (optional)</label>
        <input id={`edit-sku-${productId}`} maxLength={80} value={sku} onChange={e => setSku(e.target.value)} />
        <label htmlFor={`edit-description-${productId}`}>Description</label>
        <textarea id={`edit-description-${productId}`} rows={3} maxLength={10000} value={description} onChange={e => setDescription(e.target.value)} />
        <label htmlFor={`edit-status-${productId}`}>Catalogue status</label>
        <select id={`edit-status-${productId}`} value={status} onChange={e => setStatus(e.target.value as "draft" | "published")}>
          <option value="draft">Draft</option>
          <option value="published">Published status</option>
        </select>
        {error && <p className="form-message error" role="alert">{error}</p>}
        {success && <p className="form-message" role="status">{success}</p>}
        <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
      </form>
    </details>
  );
}
