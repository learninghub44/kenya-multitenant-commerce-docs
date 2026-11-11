import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTenantAccess } from "@/lib/tenant-access";
import { hasTenantPermission } from "@/lib/tenant-permissions";
import CategoryManager from "./category-manager";
import RoleAccessDenied from "../role-access-denied";

type CategoryRow = { id: string; name: string; slug: string; status: string; created_at: string };

export default async function CategoriesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const access = await getTenantAccess(tenantSlug);
  if (access.reason === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/${tenantSlug}/categories`)}`);
  }
  if (access.reason === "tenant_error") throw new Error("Could not verify this business workspace.");
  if (access.reason === "membership_error") throw new Error("Could not verify your business access.");
  if (!access.tenant || !access.membership || !access.user) notFound();
  const { supabase, tenant, membership } = access;
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
