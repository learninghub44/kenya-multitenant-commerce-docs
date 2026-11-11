import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import RoleAccessDenied from "../role-access-denied";

type AuditEvent = { event_id: number; actor_email: string | null; action: string; entity_type: string; entity_id: string | null; request_id: string | null; occurred_at: string };

export default async function ActivityPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=${encodeURIComponent(`/dashboard/${tenantSlug}/activity`)}`);
  const { data: tenant, error: tenantError } = await supabase.from("tenants").select("id,name,status").eq("slug", tenantSlug).maybeSingle();
  if (tenantError || !tenant || tenant.status !== "active") notFound();
  const { data: membership } = await supabase.from("tenant_memberships").select("role").eq("tenant_id", tenant.id).eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!membership) notFound();
  if (membership.role !== "owner") return <RoleAccessDenied tenantSlug={tenantSlug} role={membership.role} area="the activity log" />;
  const { data, error } = await supabase.rpc("list_tenant_audit_events", { p_tenant_id: tenant.id, p_limit: 100 });
  const events = (data ?? []) as AuditEvent[];
  return <main className="dashboard-page">
    <header className="dashboard-header"><div><p className="eyebrow">Workspace security</p><h1>Activity</h1><p className="auth-description">Recent changes recorded for {tenant.name}.</p></div></header>
    {error ? <p className="form-message error" role="alert">Could not load the activity history. Try again later.</p> : events.length === 0 ? <div className="empty-state"><h2>No activity recorded yet</h2><p>Team, store and operational changes will appear here when recorded by the application.</p></div> :
      <div className="team-panel activity-panel"><div className="activity-list">
        {events.map(event => <article className="activity-event" key={event.event_id}>
          <div><strong>{event.action.replaceAll(".", " ").replaceAll("_", " ")}</strong><span>{event.actor_email ?? "System"} · {event.entity_type}{event.entity_id ? ` #${event.entity_id}` : ""}</span></div>
          <time dateTime={event.occurred_at}>{new Date(event.occurred_at).toLocaleString()}</time>
        </article>)}
      </div></div>}
  </main>;
}
