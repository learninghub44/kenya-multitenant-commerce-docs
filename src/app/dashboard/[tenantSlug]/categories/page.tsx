import { requireTenantAccess } from "@/lib/access";
import { failLoad } from "@/lib/access/load-failure";
import { hasPermission } from "@/lib/permissions";
import CategoryManager from "./category-manager";

type CategoryRow = { id: string; name: string; slug: string; status: string; created_at: string };

export default async function CategoriesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const access = await requireTenantAccess(tenantSlug, { permission: "products.update", area: "product categories", path: "/categories" });
  if (access.denied) return access.denied;
  const { supabase, tenant, role } = access;

  const { data, error } = await supabase.from("categories")
    .select("id, name, slug, status, created_at").eq("tenant_id", tenant.id).order("name");
  if (error) failLoad("categories #1", error);

  const canManage = hasPermission(role, "products.update");
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
