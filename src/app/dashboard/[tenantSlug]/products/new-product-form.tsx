"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function NewProductForm({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [sku, setSku] = useState("");
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
      const cleanSlug = slugify(slug);
      const numericPrice = Number(price);
      if (!cleanTitle || cleanTitle.length > 180) throw new Error("Enter a product name up to 180 characters.");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug) || cleanSlug.length > 180) throw new Error("Enter a valid product URL slug.");
      if (!Number.isFinite(numericPrice) || numericPrice < 0 || !/^\d{1,10}(?:\.\d{1,2})?$/.test(price.trim())) throw new Error("Enter a price with up to two decimal places.");
      const priceMinor = Math.round(numericPrice * 100);
      if (!Number.isSafeInteger(priceMinor)) throw new Error("Price is too large.");
      if (description.length > 10000) throw new Error("Description must be 10,000 characters or fewer.");

      const supabase = createSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        router.replace("/auth?next=/dashboard");
        return;
      }
      const { error: createError } = await supabase.rpc("create_product_with_default_variant", {
        p_tenant_id: tenantId,
        p_title: cleanTitle,
        p_slug: cleanSlug,
        p_description: description.trim(),
        p_price_minor: priceMinor,
        p_sku: sku.trim() || null
      });
      if (createError) throw createError;
      setSuccess("Product saved as a draft. It is not visible on a public storefront yet.");
      setTitle("");
      setSlug("");
      setSlugEdited(false);
      setDescription("");
      setPrice("");
      setSku("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create this product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="product-form" onSubmit={submit}>
      <h2>Add a product</h2>
      <p className="auth-description">New products start as drafts. Price is stored in integer cents of KES (minor units).</p>
      <label htmlFor="product-title">Product name</label>
      <input id="product-title" required maxLength={180} value={title} onChange={e => { setTitle(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} />
      <label htmlFor="product-slug">Product URL slug</label>
      <input id="product-slug" required maxLength={180} value={slug} onChange={e => { setSlugEdited(true); setSlug(slugify(e.target.value)); }} />
      <label htmlFor="product-price">Selling price (KES)</label>
      <input id="product-price" inputMode="decimal" placeholder="e.g. 1250.00" required value={price} onChange={e => setPrice(e.target.value)} />
      <label htmlFor="product-sku">SKU (optional)</label>
      <input id="product-sku" maxLength={80} value={sku} onChange={e => setSku(e.target.value)} />
      <label htmlFor="product-description">Description</label>
      <textarea id="product-description" rows={3} maxLength={10000} value={description} onChange={e => setDescription(e.target.value)} />
      {error && <p className="form-message error" role="alert">{error}</p>}
      {success && <p className="form-message" role="status">{success}</p>}
      <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save as draft"}</button>
    </form>
  );
}
