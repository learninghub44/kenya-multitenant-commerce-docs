"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import styles from "./team.module.css";

export type TeamRole = "owner" | "manager" | "catalog_editor" | "stock_clerk" | "order_operator" | "finance_viewer";
export type TeamMember = { membership_id: string; user_id: string; member_email: string; role: string; active: boolean; joined_at: string };
export type TeamInvitation = { invitation_id: string; invite_email: string; invite_role: string; expires_at: string; accepted_at: string | null; revoked_at: string | null; created_at: string };

const roles: { value: TeamRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "catalog_editor", label: "Catalog editor" },
  { value: "stock_clerk", label: "Stock clerk" },
  { value: "order_operator", label: "Order operator" },
  { value: "finance_viewer", label: "Finance viewer" }
];

function roleName(role: string) {
  return roles.find(item => item.value === role)?.label ?? role.replaceAll("_", " ");
}

export default function TeamManager({ tenantId, initialMembers, initialInvitations }: {
  tenantId: string; initialMembers: TeamMember[]; initialInvitations: TeamInvitation[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<TeamRole, "owner">>("order_operator");
  const [inviteUrl, setInviteUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage(""); setInviteUrl("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: rpcError } = await supabase.rpc("create_tenant_invitation", {
        p_tenant_id: tenantId, p_email: email.trim().toLowerCase(), p_role: role
      });
      if (rpcError) throw rpcError;
      const created = (data as { invitation_id: string; invitation_token: string; invitation_expires_at: string }[] | null)?.[0];
      if (!created) throw new Error("The invitation could not be created.");
      const url = new URL(`/invite/${created.invitation_token}`, window.location.origin).toString();
      setInviteUrl(url);
      setInvitations(current => [{
        invitation_id: created.invitation_id, invite_email: email.trim().toLowerCase(), invite_role: role,
        expires_at: created.invitation_expires_at, accepted_at: null, revoked_at: null, created_at: new Date().toISOString()
      }, ...current.filter(item => item.invite_email !== email.trim().toLowerCase() || item.accepted_at || item.revoked_at)]);
      setEmail("");
      setMessage("Invitation created. Copy the link and send it to the person you invited.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create this invitation.");
    } finally { setBusy(false); }
  }

  async function copyInvite() {
    try { await navigator.clipboard.writeText(inviteUrl); setMessage("Invitation link copied."); }
    catch { setMessage("Copy is unavailable in this browser. Select the invitation link and copy it manually."); }
  }

  async function updateRole(member: TeamMember, nextRole: TeamRole) {
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: rpcError } = await createSupabaseBrowserClient().rpc("set_tenant_member_role", {
        p_tenant_id: tenantId, p_membership_id: member.membership_id, p_role: nextRole
      });
      if (rpcError) throw rpcError;
      setMembers(current => current.map(item => item.membership_id === member.membership_id ? { ...item, role: nextRole } : item));
      setMessage("Team role updated.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update this role."); }
    finally { setBusy(false); }
  }

  async function removeMember(member: TeamMember) {
    if (!window.confirm(`Remove ${member.member_email} from this workspace?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: rpcError } = await createSupabaseBrowserClient().rpc("remove_tenant_member", {
        p_tenant_id: tenantId, p_membership_id: member.membership_id
      });
      if (rpcError) throw rpcError;
      setMembers(current => current.map(item => item.membership_id === member.membership_id ? { ...item, active: false } : item));
      setMessage("Team member access removed.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove this team member."); }
    finally { setBusy(false); }
  }

  async function revokeInvitation(invitation: TeamInvitation) {
    if (!window.confirm(`Revoke the invitation for ${invitation.invite_email}?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: rpcError } = await createSupabaseBrowserClient().rpc("revoke_tenant_invitation", {
        p_tenant_id: tenantId, p_invitation_id: invitation.invitation_id
      });
      if (rpcError) throw rpcError;
      setInvitations(current => current.map(item => item.invitation_id === invitation.invitation_id ? { ...item, revoked_at: new Date().toISOString() } : item));
      setMessage("Invitation revoked.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not revoke this invitation."); }
    finally { setBusy(false); }
  }

  const activeOwners = members.filter(item => item.active && item.role === "owner").length;

  return <div className={styles.manager}>
    <section className={styles.panel}>
      <div className={styles.panelHeading}><div><h2>Invite a team member</h2><p>Invitations expire after seven days and can be used once.</p></div></div>
      <form className={styles.inviteForm} onSubmit={invite}>
        <div className="field"><label htmlFor="invite-email">Email address</label><input id="invite-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="staff@example.com" /></div>
        <div className="field"><label htmlFor="invite-role">Workspace role</label><select id="invite-role" value={role} onChange={event => setRole(event.target.value as Exclude<TeamRole, "owner">)}>{roles.filter(item => item.value !== "owner").map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <button className="primary-button" type="submit" disabled={busy || !email.trim()}>{busy ? "Please wait…" : "Create invitation"}</button>
      </form>
      {inviteUrl && <div className={styles.inviteLink}><label htmlFor="new-invite-link">Invitation link</label><input id="new-invite-link" readOnly value={inviteUrl} onFocus={event => event.currentTarget.select()} /><button className="secondary-button" type="button" onClick={copyInvite}>Copy link</button><p className="field-help">Send this link privately to the invited person. It is shown only once.</p></div>}
    </section>

    {error && <p className="form-message error" role="alert">{error}</p>}
    {message && <p className="form-message" role="status">{message}</p>}

    <section className={styles.panel}>
      <div className={styles.panelHeading}><div><h2>Active team</h2><p>Owners retain full control. At least one active owner is always required.</p></div><span className={styles.count}>{members.filter(item => item.active).length} active</span></div>
      <div className={styles.list}>
        {members.filter(item => item.active).map(member => <article className={styles.member} key={member.membership_id}>
          <div className={styles.memberCopy}><strong>{member.member_email || "Team member"}</strong><span>{roleName(member.role)}</span></div>
          {member.role === "owner" && activeOwners <= 1 ? <span className={styles.ownerLabel}>Owner · required</span> : <div className={styles.memberActions}>
            <label className={styles.srOnly} htmlFor={`role-${member.membership_id}`}>Role for {member.member_email}</label>
            <select id={`role-${member.membership_id}`} value={member.role} disabled={busy} onChange={event => updateRole(member, event.target.value as TeamRole)}>{roles.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <button className="secondary-button" type="button" disabled={busy} onClick={() => removeMember(member)}>Remove</button>
          </div>}
        </article>)}
      </div>
    </section>

    <section className={styles.panel}>
      <div className={styles.panelHeading}><div><h2>Invitations</h2><p>Review recent invitations and revoke unused links.</p></div></div>
      {invitations.length === 0 ? <p className={styles.empty}>No invitations yet.</p> : <div className={styles.list}>
        {invitations.map(invitation => {
          const status = invitation.accepted_at ? "Accepted" : invitation.revoked_at ? "Revoked" : new Date(invitation.expires_at) <= new Date() ? "Expired" : "Pending";
          return <article className={styles.member} key={invitation.invitation_id}>
            <div className={styles.memberCopy}><strong>{invitation.invite_email}</strong><span>{roleName(invitation.invite_role)} · Expires {new Date(invitation.expires_at).toLocaleDateString()}</span></div>
            <div className={styles.memberActions}><span className={`${styles.inviteStatus} ${styles[status.toLowerCase() as "accepted" | "revoked" | "expired" | "pending"]}`}>{status}</span>{status === "Pending" && <button className="secondary-button" type="button" disabled={busy} onClick={() => revokeInvitation(invitation)}>Revoke</button>}</div>
          </article>;
        })}
      </div>}
    </section>
  </div>;
}
