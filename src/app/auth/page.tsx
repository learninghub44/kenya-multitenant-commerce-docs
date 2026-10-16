"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import AuthShell from "./auth-shell";

function getSafeNextPath() {
  const requestedNext = new URLSearchParams(window.location.search).get("next");
  if (!requestedNext || !requestedNext.startsWith("/") || requestedNext.startsWith("//") || requestedNext.includes("\\")) {
    return "/dashboard";
  }

  try {
    const destination = new URL(requestedNext, window.location.origin);
    return destination.origin === window.location.origin
      ? `${destination.pathname}${destination.search}${destination.hash}`
      : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signup");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signin") setMode("signin");
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      router.replace(getSafeNextPath());
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      headline="Your online shop, "
      accent="ready in minutes."
      summary="One account for your storefront, stock and orders."
      points={["Publish products with photos, prices and variants", "Keep stock counts accurate as you sell", "Follow every order from request to fulfilment"]}
    >
      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="back-link" href="/">← Back to home</Link>
        <h1 id="auth-title">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-description">{mode === "signup" ? "Set up your merchant account in a minute." : "Sign in to manage your products, stock and orders."}</p>
        <div className="auth-tabs" role="group" aria-label="Account action">
          <button type="button" aria-pressed={mode === "signup"} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>Create account</button>
          <button type="button" aria-pressed={mode === "signin"} onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>Sign in</button>
        </div>
        <form onSubmit={submit}>
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" placeholder="you@business.co.ke" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} />
          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input id="password" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />
            <button className="password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button>
          </div>
          {mode === "signup" && <p className="field-help">Use at least 8 characters.</p>}
          {error && <p className="form-message error" role="alert">{error}</p>}
          {message && <p className="form-message" role="status">{message}</p>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
        </form>
        {mode === "signup" && <p className="fine-print">You may get an email to confirm your address before you can sign in.</p>}
      </section>
    </AuthShell>
  );
}
