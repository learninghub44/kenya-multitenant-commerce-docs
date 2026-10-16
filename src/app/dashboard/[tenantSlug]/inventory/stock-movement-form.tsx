"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type VariantOption = { id: string; label: string; onHand: number };

export default function StockMovementForm({
  tenantId,
  locationId,
  variants
}: {
  tenantId: string;
  locationId: string;
  variants: VariantOption[];
}) {
  const router = useRouter();
  const keyRef = useRef<string | null>(null);
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [operation, setOperation] = useState<"receipt" | "adjustment">("receipt");
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const parsedQuantity = Number(quantity);
      if (!Number.isSafeInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 100000000) {
        throw new Error("Quantity must be a whole number between 1 and 100,000,000.");
      }
      if (reason.trim().length < 3 || reason.trim().length > 500) {
        throw new Error("Enter a reason between 3 and 500 characters.");
      }
      if (!variantId) throw new Error("Choose a product variant.");
      const delta = operation === "receipt" || direction === "increase" ? parsedQuantity : -parsedQuantity;
      const supabase = createSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        router.replace("/auth?next=/dashboard");
        return;
      }
      keyRef.current ??= crypto.randomUUID();
      const { data, error: rpcError } = await supabase.rpc("record_inventory_movement", {
        p_tenant_id: tenantId,
        p_variant_id: variantId,
        p_location_id: locationId,
        p_quantity_delta: delta,
        p_movement_type: operation,
        p_reason: reason.trim(),
        p_idempotency_key: keyRef.current
      });
      if (rpcError) throw rpcError;
      setSuccess(`Stock saved. New on-hand quantity: ${data ?? "updated"}.`);
      keyRef.current = null;
      setQuantity("1");
      setReason("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the stock movement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="product-form" onSubmit={submit}>
      <h2>Receive or adjust stock</h2>
      <p className="auth-description">Every change is recorded in the stock ledger. The server prevents negative stock and safely handles retries.</p>
      <label htmlFor="stock-variant">Product</label>
      <select id="stock-variant" required value={variantId} onChange={e => setVariantId(e.target.value)}>
        {variants.length === 0 && <option value="">No product variants available</option>}
        {variants.map(item => <option key={item.id} value={item.id}>{item.label} · on hand {item.onHand}</option>)}
      </select>
      <label htmlFor="stock-operation">Operation</label>
      <select id="stock-operation" value={operation} onChange={e => setOperation(e.target.value as "receipt" | "adjustment")}>
        <option value="receipt">Receive stock</option>
        <option value="adjustment">Stock adjustment</option>
      </select>
      {operation === "adjustment" && <>
        <label htmlFor="stock-direction">Adjustment</label>
        <select id="stock-direction" value={direction} onChange={e => setDirection(e.target.value as "increase" | "decrease")}>
          <option value="increase">Increase on-hand</option>
          <option value="decrease">Decrease on-hand</option>
        </select>
      </>}
      <label htmlFor="stock-quantity">Quantity (whole units)</label>
      <input id="stock-quantity" type="number" min="1" max="100000000" step="1" required value={quantity} onChange={e => setQuantity(e.target.value)} />
      <label htmlFor="stock-reason">Reason / reference</label>
      <input id="stock-reason" required minLength={3} maxLength={500} placeholder="e.g. Supplier delivery INV-104" value={reason} onChange={e => setReason(e.target.value)} />
      {error && <p className="form-message error" role="alert">{error}</p>}
      {success && <p className="form-message" role="status">{success}</p>}
      <button className="primary-button" type="submit" disabled={busy || variants.length === 0}>{busy ? "Saving…" : "Record stock change"}</button>
    </form>
  );
}
