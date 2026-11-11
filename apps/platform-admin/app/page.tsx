import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import TenantActions, { type PlatformTenant } from "./tenant-actions";

type AuditEvent = { event_id: number; actor_email: string | null; action: string; tenant_name: string | null; reason: string; occurred_at: string };

export default async function PlatformHomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError || assurance.currentLevel !== "aal2") redirect("/mfa");
  const { data: admin, error: adminError } = await supabase.from("platform_admins").select("role,active").eq("user_id", user.id).maybeSingle();
  if (adminError || !admin?.active) redirect("/access-denied");

  const [tenantResult, auditResult] = await Promise.all([
    supabase.rpc("platform_admin_list_tenants", { p_search: null, p_limit: 100 }),
    supabase.rpc("platform_admin_list_audit_events", { p_limit: 20 })
  ]);
  const tenants = (tenantResult.data ?? []) as PlatformTenant[];
  const events = (auditResult.data ?? []) as AuditEvent[];
  const activeTenants = tenants.filter(tenant => tenant.tenant_status === "active").length;
  const suspendedTenants = tenants.filter(tenant => tenant.tenant_status === "suspended").length;

  return <main className="admin-shell stack">
    <header className="admin-topbar">
      <Link className="admin-brand" href="/" aria-label="Commerce Workspace platform admin">
        <span className="admin-brand-mark">C</span><span>Commerce Workspace<small>Platform operations</small></span>
      </Link>
      <div className="admin-topbar-actions"><span className="admin-secure-label">MFA protected</span><form action="/auth/signout" method="post"><button className="button" type="submit">Sign out</button></form></div>
    </header>
    <header className="admin-header">
      <div><p className="admin-kicker">Platform overview</p><h1>Good to see you</h1><p className="muted">{user.email} · {admin.role.replaceAll("_"," ")}</p></div>
      <span className="admin-date-label">Operations console</span>
    </header>
    <section className="admin-metrics" aria-label="Platform summary">
      <article><span>Businesses loaded</span><strong>{tenants.length}</strong><small>Maximum 100 per request</small></article>
      <article><span>Active in list</span><strong>{activeTenants}</strong><small>Currently enabled</small></article>
      <article><span>Suspended in list</span><strong>{suspendedTenants}</strong><small>Access restricted</small></article>
      <article><span>Recent audit events</span><strong>{events.length}</strong><small>Latest 20 records</small></article>
    </section>
    {tenantResult.error && <p className="admin-message error" role="alert">Could not load tenant summaries.</p>}
    <TenantActions initialTenants={tenants} canChangeStatus={admin.role === "super_admin" || admin.role === "operations_admin"} />
    <section className="panel">
      <div className="toolbar"><div><p className="admin-kicker">Security trail</p><h2>Platform audit</h2><p className="muted">Administrative actions and recorded reasons.</p></div><span className="admin-count">{events.length} events</span></div>
      {auditResult.error ? <p className="admin-message error">Could not load the platform audit.</p> : events.length === 0 ? <p className="muted">No platform actions recorded yet.</p> : <div className="audit-list">
        {events.map(event=><article className="audit-row" key={event.event_id}><div><strong>{event.action.replaceAll("."," ")}</strong><br/><span>{event.actor_email ?? "Operator"} · {event.tenant_name ?? "Platform"}</span><p className="muted">{event.reason}</p></div><time>{new Date(event.occurred_at).toLocaleString()}</time></article>)}
      </div>}
    </section>
    <footer className="muted">Platform operations are MFA-gated and separately audited. <Link href="/access-denied">Access policy</Link></footer>
  </main>;
}
