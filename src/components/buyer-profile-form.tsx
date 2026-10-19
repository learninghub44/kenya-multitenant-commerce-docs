"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { normalizeKenyanPhone } from "@/lib/auth-helpers";
import { errorMessage } from "@/lib/errors";

type Props = { initial: { name: string; phone: string; address: string }; onSaved?: () => void };

export default function BuyerProfileForm({ initial, onSaved }: Props) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setSaved(false);
    try {
      const cleanPhone = phone.trim() ? normalizeKenyanPhone(phone) : "";
      if (cleanPhone === null) throw new Error("Enter a Kenyan phone number like 712 345 678.");
      const { error: rpcError } = await createSupabaseBrowserClient().rpc("save_buyer_profile", {
        p_full_name: name.trim(), p_phone: cleanPhone || null, p_address: address.trim() || null,
      });
      if (rpcError) throw rpcError;
      if (cleanPhone) setPhone(cleanPhone);
      setSaved(true); onSaved?.();
    } catch (cause) {
      setError(errorMessage(cause, "Could not save your details."));
    } finally { setBusy(false); }
  }

  return (
    <form className="buyer-form" onSubmit={submit}>
      <label htmlFor="bp-name">Full name</label>
      <input id="bp-name" required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={e => { setName(e.target.value); setSaved(false); }} />
      <label htmlFor="bp-phone">Phone</label>
      <input id="bp-phone" type="tel" inputMode="tel" maxLength={20} autoComplete="tel" placeholder="0712 345 678" value={phone} onChange={e => { setPhone(e.target.value); setSaved(false); }} />
      <label htmlFor="bp-address">Delivery address</label>
      <textarea id="bp-address" rows={3} maxLength={2000} autoComplete="street-address" value={address} onChange={e => { setAddress(e.target.value); setSaved(false); }} />
      {error && <p className="form-message error" role="alert">{error}</p>}
      {saved && <p className="form-message" role="status">Details saved. We will use them at checkout.</p>}
      <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save details"}</button>
    </form>
  );
}
