import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storeDisplayAddress } from "@/lib/store-url";
import Logo from "@/components/logo";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth?next=/dashboard");

  const { data: memberships, error } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role, active, tenants(id, name, slug, status, currency)")
    .eq("user_id", user.id)
    .eq("active", true);

  if (error) {
    return (
      <main className="dashboard-page workspaces-page">
        <p className="eyebrow">Your workspaces</p>
        <h1>Your businesses</h1>
        <p className="dashboard-alert" role="alert">Could not load your workspaces. Refresh the page, and check Supabase access if the issue continues.</p>
        <Link className="primary-button inline-button" href="/onboarding">Try workspace setup</Link>
      </main>
    );
  }

  const tenants = (memberships ?? []).flatMap(item => {
    const related = item.tenants as unknown as { id: string; name: string; slug: string; status: string; currency: string } | Array<{ id: string; name: string; slug: string; status: string; currency: string }> | null;
    const tenant = Array.isArray(related) ? related[0] : related;
    return tenant && tenant.status === "active" ? [{ ...item, tenant }] : [];
  });
  return (
    <main className="dashboard-page">
      <Logo href="/" size={42} className="page-logo" />
      <header className="workspaces-header">
        <div>
          <p className="eyebrow">Your workspaces</p>
          <h1>Your businesses</h1>
          <p className="auth-description">Choose a business to manage its catalogue, stock and orders.</p>
        </div>
        <form action="/auth/signout" method="post">
          <span className="workspace-account">{user.email ?? "Signed-in account"}</span>
          <button className="secondary-button" type="submit">Sign out</button>
        </form>
      </header>
      <section className="workspace-list" aria-label="Businesses you can access">
        {tenants.length === 0 ? (
          <div className="empty-state workspace-empty">
            <span className="workspace-empty-mark" aria-hidden="true">+</span>
            <div>
              <p className="eyebrow">A fresh start</p>
              <h2>No business workspace yet</h2>
              <p>Create a workspace to start organising your catalogue and day-to-day operations.</p>
            </div>
            <Link className="primary-button" href="/onboarding">Create your first workspace <span aria-hidden="true">→</span></Link>
          </div>
        ) : tenants.map(item => (
          <article className="workspace-card business-card" key={item.tenant_id}>
            <span className="business-mark" aria-hidden="true">{item.tenant.name.slice(0, 1).toUpperCase()}</span>
            <div className="business-card-copy">
              <h2>{item.tenant.name}</h2>
              <p className="business-slug">{storeDisplayAddress(item.tenant.slug)}</p>
              <div className="business-meta">
                <span className="workspace-status">{item.tenant.currency}</span>
                <span className="business-meta-dot" aria-hidden="true" />
                <span className="business-role">{item.role.replaceAll("_", " ")}</span>
              </div>
            </div>
            <Link className="workspace-action" href={`/dashboard/${item.tenant.slug}`}>
              Open workspace <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
        {tenants.length > 0 && (
          <Link className="workspace-create-link" href="/onboarding">
            <span className="workspace-create-plus" aria-hidden="true">+</span>
            <span><strong>Add another business</strong><small>Create a separate workspace for another store</small></span>
            <span className="workspace-create-arrow" aria-hidden="true">→</span>
          </Link>
        )}
      </section>
    </main>
  );
}
