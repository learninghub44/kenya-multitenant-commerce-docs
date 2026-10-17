"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PASSWORD_RULES, friendlyAuthError, passwordProblem } from "@/lib/auth-helpers";
import AuthShell from "../auth-shell";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ok" | "missing">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await createSupabaseBrowserClient().auth.getUser();
        setReady(data.user ? "ok" : "missing");
      } catch {
        setReady("missing");
      }
    })();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("The two passwords do not match.");
    setBusy(true);
    try {
      const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(friendlyAuthError(cause instanceof Error ? cause.message : "").text);
      setBusy(false);
    }
  }

  return (
    <AuthShell headline="Choose a " accent="new password." summary="Pick something you do not use on other sites.">
      <section className="auth-card" aria-labelledby="reset-title">
        <h1 id="reset-title">Set a new password</h1>
        {ready === "checking" && <p className="auth-description" role="status">Checking your link…</p>}
        {ready === "missing" && (
          <>
            <p className="form-message error" role="alert">This reset link has expired or was already used.</p>
            <p className="fine-print"><Link className="inline-link" href="/auth/forgot-password">Request a new reset link</Link></p>
          </>
        )}
        {ready === "ok" && (
          <form onSubmit={submit}>
            <label htmlFor="new-password">New password</label>
            <div className="password-field">
              <input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />
              <button className="password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button>
            </div>
            <ul className="password-rules" aria-label="Password requirements">
              {PASSWORD_RULES.map(rule => <li key={rule.id} className={rule.test(password) ? "is-met" : ""}>{rule.label}</li>)}
            </ul>
            <label htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required maxLength={128} value={confirm} onChange={e => setConfirm(e.target.value)} />
            {error && <p className="form-message error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
          </form>
        )}
      </section>
    </AuthShell>
  );
}
