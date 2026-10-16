"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function OrderActions({ tenantId, orderId, status, paymentStatus, canRecordPayment, canManageOrders }: {
  tenantId: string; orderId: string; status: string; paymentStatus: string;
  canRecordPayment: boolean; canManageOrders: boolean;
}) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function invoke(name: "record_manual_order_payment" | "transition_order_status", args: Record<string, unknown>) {
    setBusy(true); setError(""); setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw new Error("Your session has expired. Sign in again.");
      const { error: rpcError } = await supabase.rpc(name, args as never);
      if (rpcError) throw rpcError;
      setMessage("Order updated."); setReference(""); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this order.");
    } finally { setBusy(false); }
  }

  function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reference.trim().length < 3) { setError("Enter the actual payment reference."); return; }
    void invoke("record_manual_order_payment", {
      p_tenant_id: tenantId, p_order_id: orderId, p_reference: reference.trim(), p_notes: reason.trim()
    });
  }

  return <div className="order-actions">
    {canRecordPayment && paymentStatus !== "succeeded" && status !== "cancelled" && <form onSubmit={recordPayment}>
      <label htmlFor={`payment-ref-${orderId}`}>Record received payment reference</label>
      <input id={`payment-ref-${orderId}`} required minLength={3} maxLength={120} value={reference} onChange={e => setReference(e.target.value)} placeholder="Reference from actual payment" />
      <label htmlFor={`payment-note-${orderId}`}>Note (optional)</label>
      <input id={`payment-note-${orderId}`} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} />
      <button className="secondary-button" type="submit" disabled={busy}>Confirm payment received</button>
      <p className="field-help">Only use after independently verifying the money was received.</p>
    </form>}
    {canManageOrders && paymentStatus === "succeeded" && status === "confirmed" && <button className="secondary-button" disabled={busy} onClick={() => void invoke("transition_order_status", { p_tenant_id: tenantId, p_order_id: orderId, p_status: "processing", p_reason: reason.trim() })}>Start processing</button>}
    {canManageOrders && paymentStatus === "succeeded" && status === "processing" && <button className="secondary-button" disabled={busy} onClick={() => void invoke("transition_order_status", { p_tenant_id: tenantId, p_order_id: orderId, p_status: "ready_for_fulfilment", p_reason: reason.trim() })}>Mark ready</button>}
    {canManageOrders && paymentStatus === "succeeded" && status === "ready_for_fulfilment" && <button className="primary-button" disabled={busy} onClick={() => void invoke("transition_order_status", { p_tenant_id: tenantId, p_order_id: orderId, p_status: "fulfilled", p_reason: reason.trim() })}>Fulfil order</button>}
    {canManageOrders && paymentStatus !== "succeeded" && !["cancelled","fulfilled"].includes(status) && <button className="secondary-button" disabled={busy} onClick={() => {
      if (window.confirm("Cancel this unpaid order and release its stock reservation?")) {
        void invoke("transition_order_status", { p_tenant_id: tenantId, p_order_id: orderId, p_status: "cancelled", p_reason: "Cancelled by merchant" });
      }
    }}>Cancel unpaid order</button>}
    {error && <p className="form-message error" role="alert">{error}</p>}
    {message && <p className="form-message" role="status">{message}</p>}
  </div>;
}
