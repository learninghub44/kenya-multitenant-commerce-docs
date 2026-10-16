"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type CategoryOption = { id: string; name: string };

export default function ProductCategoryAssignment({
  tenantId, productId, currentCategoryId, categories
}: {
  tenantId: string;
  productId: string;
  currentCategoryId: string | null;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(currentCategoryId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Your session has expired. Sign in again.");
      const { error: rpcError } = await supabase.rpc("set_product_category", {
        p_tenant_id: tenantId,
        p_product_id: productId,
        p_category_id: categoryId || null
      });
      if (rpcError) throw rpcError;
      setSuccess("Category assignment saved.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not assign category.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="category-assignment" onSubmit={submit}>
    <label htmlFor={`category-${productId}`}>Category</label>
    <select id={`category-${productId}`} value={categoryId} onChange={event => setCategoryId(event.target.value)}>
      <option value="">Uncategorized</option>
      {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
    </select>
    <button className="secondary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save category"}</button>
    {error && <p className="form-message error" role="alert">{error}</p>}
    {success && <p className="form-message" role="status">{success}</p>}
  </form>;
}
