import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/access";
import Logo from "@/components/logo";
import { BusinessClock, BusinessIdChip } from "./[tenantSlug]/business-badge";
import BusinessCardMotion from "./business-card-motion";

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const supabase = await createSupabaseServerClient();

  const { data: memberships, error } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role, active, tenants(id, name, slug, status, currency, business_code, timezone)")
    .eq("user_id", user.id)
    .eq("active", true);

  if (error) {
    return (
      <main className="dashboard-page workspaces-page">
        <p className="eyebrow">Your workspaces</p>
        <h1>Your businesses</h1>
        <p className="dashboard-alert" role="alert">Could not load your workspaces. Refresh the page, and contact support if the issue continues.</p>
        <Link className="primary-button inline-button" href="/onboarding">Try workspace setup</Link>
      </main>
    );
  }

  const tenants = (memberships ?? []).flatMap(item => {
    const related = item.tenants as unknown as { id: string; name: string; slug: string; status: string; currency: string; business_code: string | null; timezone: string | null } | Array<{ id: string; name: string; slug: string; status: string; currency: string; business_code: string | null; timezone: string | null }> | null;
    const tenant = Array.isArray(related) ? related[0] : related;
    return tenant && tenant.status === "active" ? [{ ...item, tenant }] : [];
  });
  return (
    <main className="dashboard-page workspaces-page workspaces-compact">
      <Logo href="/" size={36} className="page-logo" />
      <header className="workspaces-header">
        <div>
          <h1>Your businesses</h1>
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
              <h2>No business yet</h2>
            </div>
            <Link className="primary-button" href="/onboarding">Create business <span aria-hidden="true">→</span></Link>
          </div>
        ) : tenants.map(item => (
          <BusinessCardMotion key={item.tenant_id}>
            <span className="business-mark" aria-hidden="true">{item.tenant.name.slice(0, 1).toUpperCase()}</span>
            <div className="business-card-copy">
              <h2 title={item.tenant.name}>{item.tenant.name}</h2>
              <div className="business-card-identity">
                {item.tenant.business_code ? <BusinessIdChip code={item.tenant.business_code} /> : <span className="business-id-pending">ID pending</span>}
                <BusinessClock timezone={item.tenant.timezone || "Africa/Nairobi"} />
              </div>
              <div className="business-meta">
                <span className="workspace-status">{item.tenant.currency}</span>
                <span className="business-meta-dot" aria-hidden="true" />
                <span className="business-role">{item.role.replaceAll("_", " ")}</span>
              </div>
            </div>
            <Link className="workspace-action" href={`/dashboard/${item.tenant.slug}`}>
              Open workspace <span aria-hidden="true">→</span>
            </Link>
          </BusinessCardMotion>
        ))}
        {tenants.length > 0 && (
          <Link className="workspace-create-link" href="/onboarding">
            <span className="workspace-create-plus" aria-hidden="true">+</span>
            <span><strong>Add business</strong></span>
            <span className="workspace-create-arrow" aria-hidden="true">→</span>
          </Link>
        )}
      </section>
    </main>
  );
}
