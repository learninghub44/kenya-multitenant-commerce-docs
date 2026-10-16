"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function CategoryManager({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const cleanName = name.trim();
      const cleanSlug = slugify(slug);
      if (!cleanName || cleanName.length > 100) throw new Error("Enter a category name up to 100 characters.");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug) || cleanSlug.length > 100) throw new Error("Enter a valid category URL slug.");
      const supabase = createSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Your session has expired. Sign in again.");
      const { error: rpcError } = await supabase.rpc("create_tenant_category", {
        p_tenant_id: tenantId, p_name: cleanName, p_slug: cleanSlug
      });
      if (rpcError) throw rpcError;
      setSuccess("Category created.");
      setName("");
      setSlug("");
      setSlugEdited(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create this category.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="product-form" onSubmit={submit}>
    <h2>Add a category</h2>
    <p className="auth-description">Create tenant-specific categories for organizing the catalogue. Category deletion is intentionally unavailable while product assignment is being built.</p>
    <label htmlFor="category-name">Category name</label>
    <input id="category-name" required maxLength={100} value={name} onChange={event => {
      setName(event.target.value);
      if (!slugEdited) setSlug(slugify(event.target.value));
    }} />
    <label htmlFor="category-slug">Category URL slug</label>
    <input id="category-slug" required maxLength={100} value={slug} onChange={event => {
      setSlugEdited(true);
      setSlug(slugify(event.target.value));
    }} />
    {error && <p className="form-message error" role="alert">{error}</p>}
    {success && <p className="form-message" role="status">{success}</p>}
    <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Create category"}</button>
  </form>;
}
