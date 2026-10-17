"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { friendlyAuthError } from "@/lib/auth-helpers";
import AuthShell from "../auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: resetError } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (cause) {
      setError(friendlyAuthError(cause instanceof Error ? cause.message : "").text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell headline="Locked out? " accent="We'll get you back in." summary="Enter your email and we will send a link to choose a new password.">
      <section className="auth-card" aria-labelledby="forgot-title">
        <Link className="back-link" href="/auth?mode=signin">← Back to sign in</Link>
        <h1 id="forgot-title">Reset your password</h1>
        <p className="auth-description">We will email you a link that works once.</p>
        {sent ? (
          <p className="form-message" role="status">If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.</p>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} />
            {error && <p className="form-message error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={busy}>{busy ? "Please wait…" : "Send reset link"}</button>
          </form>
        )}
      </section>
    </AuthShell>
  );
}
