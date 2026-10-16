"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Category = { id: string; name: string; slug: string; status: string };

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function CategoryManager({ tenantId, categories }: { tenantId: string; categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setSuccess("");
    try {
      const cleanName = name.trim();
      const cleanSlug = slugify(slug);
      if (!cleanName || cleanName.length > 100) throw new Error("Enter a category name up to 100 characters.");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug) || cleanSlug.length > 100) throw new Error("Enter a valid category URL slug.");
      const supabase = createSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw new Error("Your session has expired. Sign in again.");
      const { error: rpcError } = await supabase.rpc("create_tenant_category", { p_tenant_id: tenantId, p_name: cleanName, p_slug: cleanSlug });
      if (rpcError) throw rpcError;
      setSuccess("Category created."); setName(""); setSlug(""); setSlugEdited(false); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create this category.");
    } finally { setBusy(false); }
  }

  async function changeCategory(category: Category, status: "published" | "archived") {
    setError(""); setSuccess(""); setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw new Error("Your session has expired. Sign in again.");
      const nextName = window.prompt("Category name", category.name);
      if (nextName === null) return;
      const nextSlugInput = window.prompt("Category URL slug", category.slug);
      if (nextSlugInput === null) return;
      const nextSlug = slugify(nextSlugInput);
      if (!nextName.trim() || nextName.trim().length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) {
        throw new Error("Enter a valid category name and slug.");
      }
      const { error: rpcError } = await supabase.rpc("update_tenant_category", {
        p_tenant_id: tenantId, p_category_id: category.id, p_name: nextName.trim(), p_slug: nextSlug, p_status: status
      });
      if (rpcError) throw rpcError;
      setSuccess(status === "archived" ? "Category archived. Existing product history is preserved." : "Category updated and published.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this category.");
    } finally { setBusy(false); }
  }

  return <>
    <section className="workspace-list" aria-label="Manage existing categories">
      {categories.map(category => <article className="workspace-card" key={category.id}>
        <div><h2>{category.name}</h2><p>/{category.slug}</p><span className="workspace-status">{category.status}</span></div>
        <div className="category-actions">
          <button className="secondary-button" type="button" disabled={busy} onClick={() => changeCategory(category, category.status === "archived" ? "published" : "published")}>Edit / publish</button>
          <button className="secondary-button" type="button" disabled={busy || category.status === "archived"} onClick={() => changeCategory(category, "archived")}>Archive</button>
        </div>
      </article>)}
    </section>
    <form className="product-form" onSubmit={saveCategory}>
      <h2>Add a category</h2>
      <p className="auth-description">Categories are private to this business. Archived categories are unavailable for new product assignments.</p>
      <label htmlFor="category-name">Category name</label>
      <input id="category-name" required maxLength={100} value={name} onChange={event => { setName(event.target.value); if (!slugEdited) setSlug(slugify(event.target.value)); }} />
      <label htmlFor="category-slug">Category URL slug</label>
      <input id="category-slug" required maxLength={100} value={slug} onChange={event => { setSlugEdited(true); setSlug(slugify(event.target.value)); }} />
      {error && <p className="form-message error" role="alert">{error}</p>}
      {success && <p className="form-message" role="status">{success}</p>}
      <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Create category"}</button>
    </form>
  </>;
}
