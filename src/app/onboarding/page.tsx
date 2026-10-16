"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import AuthShell from "../auth/auth-shell";

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
    <AuthShell
      headline="Give your business "
      accent="its own workspace."
      summary="Each workspace keeps its catalogue, stock and team separate from your other businesses."
    >
      <section className="auth-card" aria-labelledby="onboarding-title">
        <Link className="back-link" href="/dashboard">← Back to your businesses</Link>
        <p className="eyebrow">Set up your business</p>
        <h1 id="onboarding-title">Create a workspace</h1>
        <p className="auth-description">Start with a name and a store address. You can add products next.</p>
        <form onSubmit={submit}>
          <label htmlFor="business-name">Business name</label>
          <input id="business-name" autoComplete="organization" placeholder="e.g. Wanjiku Fashions" required minLength={2} maxLength={120} value={name} onChange={e => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} />
          <label htmlFor="store-address">Store address</label>
          <input id="store-address" required minLength={3} maxLength={50} value={slug} onChange={e => { setSlugEdited(true); setSlug(slugify(e.target.value)); }} />
          <p className="field-help">Your store link will end with <strong>/store/{slug || "your-store"}</strong>. Custom domains are not available yet.</p>
          {error && <p className="form-message error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Creating workspace…" : "Create workspace"}</button>
        </form>
      </section>
    </AuthShell>
  );
}
