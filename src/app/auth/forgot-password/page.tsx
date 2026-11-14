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
        <Link className="back-link" href="/login">← Back to sign in</Link>
        <h1 id="forgot-title">Reset your password</h1>
        <p className="auth-description">We will email you a link that works once.</p>
        {sent ? (
          <div className="auth-email-sent" role="status" aria-live="polite">
            <div className="auth-email-sent-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><rect x="5" y="10" width="38" height="28" rx="6" stroke="currentColor" strokeWidth="2.5"/><path d="m8 14 16 13 16-13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="m31 32 4 4 8-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
            <h2>Check your email</h2>
            <p>If an account exists for <strong>{email.trim().toLowerCase()}</strong>, a password reset link is on its way. Check your inbox and spam folder.</p>
            <button className="auth-email-edit" type="button" onClick={() => setSent(false)}>Use a different email</button>
          </div>
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
