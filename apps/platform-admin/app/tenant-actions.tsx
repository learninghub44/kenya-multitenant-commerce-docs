"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type PlatformTenant = { tenant_id: string; tenant_name: string; tenant_slug: string; tenant_status: "active" | "suspended" | "closed"; created_at: string; active_members: number };

export default function TenantActions({ initialTenants, canChangeStatus }: { initialTenants: PlatformTenant[]; canChangeStatus: boolean }) {
  const router = useRouter();
  const [tenants,setTenants] = useState(initialTenants);
  const [search,setSearch] = useState("");
  const [reason,setReason] = useState("");
  const [busy,setBusy] = useState("");
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const visible = tenants.filter(item => `${item.tenant_name} ${item.tenant_slug}`.toLowerCase().includes(search.toLowerCase()));

  async function changeStatus(tenant: PlatformTenant) {
    const next = tenant.tenant_status === "active" ? "suspended" : "active";
    if (reason.trim().length < 10) { setError("Enter a reason of at least 10 characters before changing status."); return; }
    setBusy(tenant.tenant_id); setError(""); setMessage("");
    try {
      const { error: rpcError } = await createSupabaseBrowserClient().rpc("platform_admin_set_tenant_status", {
        p_tenant_id: tenant.tenant_id, p_status: next, p_reason: reason.trim()
      });
      if (rpcError) throw rpcError;
      setTenants(current => current.map(item => item.tenant_id === tenant.tenant_id ? { ...item, tenant_status: next } : item));
      setReason(""); setMessage(`${tenant.tenant_name} is now ${next}.`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update tenant status."); }
    finally { setBusy(""); }
  }

  return <section className="panel">
    <div className="toolbar"><div><h2>Tenants</h2><p className="muted">Limited operational summary. No customer records or impersonation.</p></div><input aria-label="Search tenants" placeholder="Search name or store address" value={search} onChange={event=>setSearch(event.target.value)} /></div>
    {canChangeStatus && <div className="admin-reason"><label htmlFor="status-reason">Reason for a status change</label><textarea id="status-reason" minLength={10} maxLength={500} value={reason} onChange={event=>setReason(event.target.value)} placeholder="Record the support or operational reason. This is written to the platform audit log." /></div>}
    {error && <p className="admin-message error" role="alert">{error}</p>}
    {message && <p className="admin-message" role="status">{message}</p>}
    <div className="table-wrap"><table><thead><tr><th>Business</th><th>Store address</th><th>Status</th><th>Members</th><th>Created</th>{canChangeStatus && <th>Action</th>}</tr></thead>
      <tbody>{visible.map(tenant=><tr key={tenant.tenant_id}>
        <td><strong>{tenant.tenant_name}</strong><small>{tenant.tenant_id}</small></td><td>{tenant.tenant_slug}</td>
        <td><span className={`status ${tenant.tenant_status}`}>{tenant.tenant_status}</span></td><td>{tenant.active_members}</td><td>{new Date(tenant.created_at).toLocaleDateString()}</td>
        {canChangeStatus && <td><button className={`button ${tenant.tenant_status === "active" ? "button-danger" : "button-primary"}`} disabled={busy === tenant.tenant_id || tenant.tenant_status === "closed"} onClick={()=>changeStatus(tenant)}>{busy === tenant.tenant_id ? "Saving…" : tenant.tenant_status === "active" ? "Suspend" : "Reactivate"}</button></td>}
      </tr>)}</tbody>
    </table></div>
    {visible.length === 0 && <p className="muted">No matching tenants.</p>}
  </section>;
}
