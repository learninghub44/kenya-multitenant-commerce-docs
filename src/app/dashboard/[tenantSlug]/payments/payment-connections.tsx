"use client";

import { useEffect, useMemo, useState } from "react";

type Provider = "daraja" | "payhero";
type Connection = { provider: Provider; environment: string; enabled: boolean; display_name: string | null; last_verified_at: string | null; updated_at: string };
const fields: Record<Provider, { key: string; label: string; hint?: string }[]> = {
  daraja: [
    { key: "consumer_key", label: "Consumer key" },
    { key: "consumer_secret", label: "Consumer secret" },
    { key: "shortcode", label: "Business shortcode / Till number" },
    { key: "passkey", label: "Lipa Na M-PESA passkey" },
  ],
  payhero: [
    { key: "api_username", label: "API username" },
    { key: "api_key", label: "API key" },
    { key: "channel_id", label: "Channel ID (if issued)" },
  ],
};

export default function PaymentConnections({ tenantSlug }: { tenantSlug: string }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [provider, setProvider] = useState<Provider>("daraja");
  const [environment, setEnvironment] = useState("sandbox");
  const [displayName, setDisplayName] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const endpoint = useMemo(() => `/api/tenants/${encodeURIComponent(tenantSlug)}/payment-connections`, [tenantSlug]);

  useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: "no-store" }).then(async response => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load provider connections.");
      if (active) setConnections(payload.connections ?? []);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Could not load provider connections."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, environment, display_name: displayName, credentials }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save provider credentials.");
      setMessage(payload.message);
      setCredentials({});
      const refresh = await fetch(endpoint, { cache: "no-store" });
      if (refresh.ok) { const data = await refresh.json(); setConnections(data.connections ?? []); }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save provider credentials.");
    } finally { setSaving(false); }
  }

  const selected = connections.find(connection => connection.provider === provider);

  return (
    <div className="payment-connections">
      <section className="dashboard-panel">
        <div className="dashboard-panel-header">
          <div><h2>Your provider accounts</h2><p>Connect credentials issued to your own business. Each store saves its own provider account separately.</p></div>
        </div>
        {loading ? <p>Loading connections…</p> : connections.length === 0 ? <p>No provider accounts have been added to this store yet.</p> : (
          <div className="settings-provider-list">
            {connections.map(connection => <article className="settings-provider-row" key={connection.provider}>
              <div><h3>{connection.provider === "daraja" ? "M-PESA Daraja" : "PayHero"}</h3>
                <p>{connection.environment} · Credentials saved · Payments not enabled</p></div>
              <span className="status-badge status-pending">Setup incomplete</span>
            </article>)}
          </div>
        )}
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel-header">
          <div><h2>Add or update a provider account</h2><p>Use credentials issued to this merchant account, not another store&apos;s credentials.</p></div>
        </div>
        <form className="payment-connection-form" onSubmit={save}>
          <label>Payment provider
            <select value={provider} onChange={event => { setProvider(event.target.value as Provider); setCredentials({}); setMessage(""); }}>
              <option value="daraja">M-PESA Daraja</option><option value="payhero">PayHero</option>
            </select>
          </label>
          {selected && <p className="form-hint">An account for this provider is already saved. Enter the replacement credentials to rotate them; saved secrets are never sent back to this screen.</p>}
          <label>Environment
            <select value={environment} onChange={event => setEnvironment(event.target.value)}>
              <option value="sandbox">Sandbox / test</option><option value="production">Production</option>
            </select>
          </label>
          <label>Account label (optional)
            <input value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={80} placeholder="e.g. Main shop Till" />
          </label>
          {fields[provider].map(field => <label key={field.key}>{field.label}
            <input type="password" autoComplete="new-password" value={credentials[field.key] ?? ""} onChange={event => setCredentials(current => ({ ...current, [field.key]: event.target.value }))} required={field.key !== "channel_id"} />
          </label>)}
          <button className="workspace-action" type="submit" disabled={saving}>{saving ? "Encrypting and saving…" : selected ? "Replace saved credentials" : "Save provider credentials"}</button>
          {message && <p className="dashboard-alert" role="status">{message}</p>}
          {error && <p className="dashboard-alert" role="alert">{error}</p>}
        </form>
      </section>
      <section className="dashboard-panel">
        <h2>Before payments can go live</h2>
        <ul>
          <li>Set the server secret <code>PAYMENT_CREDENTIALS_ENCRYPTION_KEY</code> to a securely generated 32-byte base64 key.</li>
          <li>Apply the latest Supabase migration for tenant payment connections.</li>
          <li>Provider-specific initiation, callback authentication, transaction reconciliation and sandbox verification must be completed before enabling collection.</li>
          <li>Saving credentials does not activate payment collection and does not verify that credentials are valid.</li>
        </ul>
      </section>
    </div>
  );
}
