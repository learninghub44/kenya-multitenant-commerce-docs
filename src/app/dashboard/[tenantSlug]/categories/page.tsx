import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CategoryManager from "./category-manager";
import RoleAccessDenied from "../role-access-denied";

type CategoryRow = { id: string; name: string; slug: string; status: string; created_at: string };

export default async function CategoriesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/auth?next=${encodeURIComponent(`/dashboard/${tenantSlug}/categories`)}`);

  const { data: tenant, error: tenantError } = await supabase.from("tenants")
    .select("id, name, slug, status").eq("slug", tenantSlug).maybeSingle();
  if (tenantError || !tenant || tenant.status !== "active") notFound();

  const { data: membership } = await supabase.from("tenant_memberships")
    .select("role").eq("tenant_id", tenant.id).eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!membership) notFound();
  if (!["owner", "manager", "catalog_editor"].includes(membership.role)) {
    return <RoleAccessDenied tenantSlug={tenantSlug} role={membership.role} area="product categories" />;
  }

  const { data, error } = await supabase.from("categories")
    .select("id, name, slug, status, created_at").eq("tenant_id", tenant.id).order("name");
  if (error) {
    return <main className="dashboard-page"><Link href={`/dashboard/${tenant.slug}/products`}>← Products</Link><p role="alert">Could not load categories. Confirm the category migration is applied.</p></main>;
  }

  const canManage = ["owner", "manager", "catalog_editor"].includes(membership.role);
  const categories = (data ?? []) as CategoryRow[];
  return <main className="dashboard-page">
    <header className="dashboard-header"><div><p className="eyebrow">Product catalogue</p><h1>Categories</h1><p className="auth-description">Organize products for {tenant.name}.</p></div><span className="workspace-status">{categories.length} categories</span></header>
    <section className="workspace-list">
      {!canManage && (categories.length === 0 ? <div className="empty-state"><h2>No categories yet</h2><p>This business has not created categories.</p></div> : categories.map(category =>
        <article className="workspace-card" key={category.id}><div><h2>{category.name}</h2><p>/{category.slug}</p></div><span className="workspace-status">{category.status}</span></article>
      ))}
    </section>
    {canManage ? <CategoryManager tenantId={tenant.id} categories={categories} /> : <p className="field-help">Your role can view categories but cannot create them.</p>}
  </main>;
}
