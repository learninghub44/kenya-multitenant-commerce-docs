import { requireTenantAccess } from "@/lib/access";
import styles from "../team/team.module.css";

type AuditEvent = { event_id: number; actor_email: string | null; action: string; entity_type: string; entity_id: string | null; request_id: string | null; occurred_at: string };

function humanAction(action: string) {
  const text = action.replaceAll(".", " ").replaceAll("_", " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function ActivityPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const access = await requireTenantAccess(tenantSlug, { permission: "audit.read", area: "the activity log", path: "/activity" });
  if (access.denied) return access.denied;
  const { supabase, tenant } = access;
  const { data, error } = await supabase.rpc("list_tenant_audit_events", { p_tenant_id: tenant.id, p_limit: 100 });
  const events = (data ?? []) as AuditEvent[];
  return <main className="dashboard-page">
    <header className="dashboard-header"><div><p className="eyebrow">Workspace security</p><h1>Activity</h1><p className="auth-description">Recent changes recorded for {tenant.name}.</p></div></header>
    {error ? <p className="form-message error" role="alert">Could not load the activity history. Try again later.</p> : events.length === 0 ? <div className="empty-state"><h2>No activity recorded yet</h2><p>Team, store and operational changes will appear here when recorded by the application.</p></div> :
      <div className={`${styles.panel} ${styles.activityPanel}`}><div className={styles.activityList}>
        {events.map(event => <article className={styles.activityEvent} key={event.event_id}>
          <div><strong>{humanAction(event.action)}</strong><span>{event.actor_email ?? "System"} · {event.entity_type}{event.entity_id ? ` #${event.entity_id}` : ""}</span></div>
          <time dateTime={event.occurred_at}>{new Date(event.occurred_at).toLocaleString("en-KE",{dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Nairobi"})}</time>
        </article>)}
      </div></div>}
  </main>;
}
