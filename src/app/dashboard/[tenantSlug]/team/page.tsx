import { requireTenantAccess } from "@/lib/access";
import TeamManager, { type TeamInvitation, type TeamMember } from "./team-manager";

export default async function TeamPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const access = await requireTenantAccess(tenantSlug, { permission: "staff.manage", area: "team management", path: "/team" });
  if (access.denied) return access.denied;
  const { supabase, tenant } = access;

  const [membersResult, invitationsResult] = await Promise.all([
    supabase.rpc("list_tenant_team", { p_tenant_id: tenant.id }),
    supabase.rpc("list_tenant_invitations", { p_tenant_id: tenant.id })
  ]);
  const members = (membersResult.data ?? []) as TeamMember[];
  const invitations = (invitationsResult.data ?? []) as TeamInvitation[];

  return <main className="dashboard-page">
    <header className="dashboard-header">
      <div><p className="eyebrow">Workspace access</p><h1>Team</h1><p className="auth-description">Invite staff and give each person access that matches their work.</p></div>
    </header>
    {(membersResult.error || invitationsResult.error) && <p className="form-message error" role="alert">Some team information could not be loaded. Refresh the page or try again.</p>}
    <TeamManager tenantId={tenant.id} initialMembers={members} initialInvitations={invitations} />
  </main>;
}
