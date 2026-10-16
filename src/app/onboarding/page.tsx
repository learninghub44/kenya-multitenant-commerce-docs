"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50).replace(/-+$/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        router.replace("/auth?next=/onboarding");
        return;
      }
      const cleanName = name.trim();
      const cleanSlug = slugify(slug);
      if (cleanName.length < 2 || cleanName.length > 120) throw new Error("Business name must be between 2 and 120 characters.");
      if (!/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/.test(cleanSlug)) throw new Error("Choose a store address with 3–50 letters, numbers or hyphens; start and end with a letter or number.");
      const { error: rpcError } = await supabase.rpc("create_tenant_for_current_user", {
        p_name: cleanName,
        p_slug: cleanSlug
      });
      if (rpcError) throw rpcError;
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create your business workspace.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="onboarding-title">
        <a className="back-link" href="/dashboard">← Dashboard</a>
        <p className="eyebrow">SET UP YOUR BUSINESS</p>
        <h1 id="onboarding-title">Create a workspace</h1>
        <p className="auth-description">Your workspace keeps your catalogue, inventory and team membership separate from other businesses.</p>
        <form onSubmit={submit}>
          <label htmlFor="business-name">Business name</label>
          <input id="business-name" autoComplete="organization" required minLength={2} maxLength={120} value={name} onChange={e => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} />
          <label htmlFor="store-address">Store address</label>
          <div className="slug-field"><input id="store-address" required minLength={3} maxLength={50} value={slug} onChange={e => { setSlugEdited(true); setSlug(slugify(e.target.value)); }} /><span>.your-store-domain</span></div>
          <p className="field-help">This becomes your unique store slug. Domain routing is not enabled yet.</p>
          {error && <p className="form-message error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Creating workspace…" : "Create workspace"}</button>
        </form>
      </section>
    </main>
  );
}
