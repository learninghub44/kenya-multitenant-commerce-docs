import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import RoleAccessDenied from "../role-access-denied";
import TeamManager, { type TeamInvitation, type TeamMember } from "./team-manager";

export default async function TeamPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=${encodeURIComponent(`/dashboard/${tenantSlug}/team`)}`);

  const { data: tenant, error: tenantError } = await supabase.from("tenants")
    .select("id, name, slug, status").eq("slug", tenantSlug).maybeSingle();
  if (tenantError || !tenant || tenant.status !== "active") notFound();

  const { data: membership } = await supabase.from("tenant_memberships")
    .select("role").eq("tenant_id", tenant.id).eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!membership) notFound();
  if (membership.role !== "owner") return <RoleAccessDenied tenantSlug={tenantSlug} role={membership.role} area="team management" />;

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
