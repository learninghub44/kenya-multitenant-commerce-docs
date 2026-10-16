"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setMessage("Check your email for the confirmation link. Once confirmed, return here to sign in.");
        return;
      }
      router.replace(searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <a className="back-link" href="/">Commerce Workspace</a>
        <p className="eyebrow">MERCHANT ACCOUNT</p>
        <h1 id="auth-title">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-description">One secure account for your products, stock and orders.</p>
        <div className="auth-tabs" role="group" aria-label="Account action">
          <button type="button" aria-pressed={mode === "signup"} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>Create account</button>
          <button type="button" aria-pressed={mode === "signin"} onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>Sign in</button>
        </div>
        <form onSubmit={submit}>
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />
          {error && <p className="form-message error" role="alert">{error}</p>}
          {message && <p className="form-message" role="status">{message}</p>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
        </form>
        <p className="fine-print">Use a unique password. Email confirmation follows the Supabase project’s Auth settings.</p>
      </section>
    </main>
  );
}
