"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PASSWORD_RULES, friendlyAuthError, getSafeNextPath, normalizeKenyanPhone, passwordProblem } from "@/lib/auth-helpers";
import AuthShell from "./auth-shell";

type Mode = "signup" | "signin" | "link";

const CALLBACK_ERRORS: Record<string, string> = {
  cancelled: "Sign-in was cancelled. You can try again.",
  link_expired: "That link has expired or was already used. Request a new one.",
  link_invalid: "That link is not valid. Request a new one.",
  unavailable: "Sign-in is temporarily unavailable. Please try again shortly.",
};

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signin") setMode("signin");
    const callbackError = params.get("error");
    if (callbackError) setError(CALLBACK_ERRORS[callbackError] ?? "Sign-in failed. Please try again.");

    // A signed-in visitor has nothing to do here.
    (async () => {
      try {
        const { data } = await createSupabaseBrowserClient().auth.getUser();
        if (data.user) router.replace(getSafeNextPath(params.get("next"), window.location.origin));
      } catch {
        // No session or Supabase not reachable: stay on the sign-in form.
      }
    })();
  }, [router]);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setMessage("");
    setNeedsConfirmation(false);
  }

  function callbackUrl() {
    const next = getSafeNextPath(new URLSearchParams(window.location.search).get("next"), window.location.origin);
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function continueWithGoogle() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error: oauthError } = await createSupabaseBrowserClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl(), queryParams: { prompt: "select_account" } },
      });
      if (oauthError) throw oauthError;
    } catch (cause) {
      setError(friendlyAuthError(cause instanceof Error ? cause.message : "").text);
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    setBusy(true);
    setError("");
    try {
      const { error: resendError } = await createSupabaseBrowserClient().auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl() },
      });
      if (resendError) throw resendError;
      setNeedsConfirmation(false);
      setMessage("We sent a new confirmation email. Check your inbox and spam folder.");
    } catch (cause) {
      setError(friendlyAuthError(cause instanceof Error ? cause.message : "").text);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    setNeedsConfirmation(false);
    try {
      const supabase = createSupabaseBrowserClient();
      const cleanEmail = email.trim().toLowerCase();

      if (mode === "link") {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
        });
        if (otpError) throw otpError;
        setMessage("Check your email. We sent you a link that signs you in.");
        return;
      }

      if (mode === "signup") {
        const cleanName = fullName.trim();
        if (cleanName.length < 2 || cleanName.length > 120) throw new Error("__validation:Enter your full name.");
        const problem = passwordProblem(password);
        if (problem) throw new Error(`__validation:${problem}`);
        let normalizedPhone: string | undefined;
        if (phone.trim()) {
          const parsed = normalizeKenyanPhone(phone);
          if (!parsed) throw new Error("__validation:Enter a Kenyan phone number like 0712 345 678.");
          normalizedPhone = parsed;
        }
        const result = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: callbackUrl(), data: { full_name: cleanName, ...(normalizedPhone ? { phone: normalizedPhone } : {}) } },
        });
        if (result.error) throw result.error;
        if (!result.data.session) {
          // Same message whether or not the address already has an account.
          setMessage("Check your email to confirm your account, then sign in.");
          return;
        }
      } else {
        const result = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (result.error) throw result.error;
      }

      router.replace(getSafeNextPath(new URLSearchParams(window.location.search).get("next"), window.location.origin));
      router.refresh();
    } catch (cause) {
      const raw = cause instanceof Error ? cause.message : "";
      if (raw.startsWith("__validation:")) {
        setError(raw.slice("__validation:".length));
      } else {
        const friendly = friendlyAuthError(raw);
        setError(friendly.text);
        setNeedsConfirmation(friendly.code === "unconfirmed");
      }
    } finally {
      setBusy(false);
    }
  }

  const heading = mode === "signup" ? "Create your account" : mode === "signin" ? "Welcome back" : "Sign in with an email link";
  const description = mode === "signup"
    ? "Join free and open your online shop."
    : mode === "signin"
      ? "Sign in to manage your products, stock and orders."
      : "No password needed. We email you a one-time link.";

  return (
    <AuthShell
      headline="Your online shop, "
      accent="ready in minutes."
      summary="One account for your storefront, stock and orders."
      points={["Your own shop link, like yourshop.example.co.ke", "Keep stock counts accurate as you sell", "Follow every order from request to fulfilment"]}
    >
      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="back-link" href="/">← Back to home</Link>
        <h1 id="auth-title">{heading}</h1>
        <p className="auth-description">{description}</p>

        <button className="provider-button" type="button" onClick={continueWithGoogle} disabled={busy}>
          <GoogleIcon /> Continue with Google
        </button>
        <div className="auth-divider"><span>or use your email</span></div>

        <div className="auth-tabs auth-tabs-3" role="group" aria-label="Email option">
          <button type="button" aria-pressed={mode === "signup"} onClick={() => switchMode("signup")}>Create account</button>
          <button type="button" aria-pressed={mode === "signin"} onClick={() => switchMode("signin")}>Sign in</button>
          <button type="button" aria-pressed={mode === "link"} onClick={() => switchMode("link")}>Email link</button>
        </div>

        <form onSubmit={submit} noValidate={false}>
          {mode === "signup" && (
            <div className="field-row">
              <div>
                <label htmlFor="full-name">Full name</label>
                <input id="full-name" autoComplete="name" required minLength={2} maxLength={120} value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="phone">Phone <span className="optional">(optional)</span></label>
                <input id="phone" type="tel" autoComplete="tel" placeholder="0712 345 678" maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>
          )}
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" placeholder="you@business.co.ke" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} />

          {mode !== "link" && (
            <>
              <div className="label-row">
                <label htmlFor="password">Password</label>
                {mode === "signin" && <Link className="inline-link" href="/auth/forgot-password">Forgot password?</Link>}
              </div>
              <div className="password-field">
                <input id="password" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 8 : 1} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />
                <button className="password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button>
              </div>
              {mode === "signup" && (
                <ul className="password-rules" aria-label="Password requirements">
                  {PASSWORD_RULES.map(rule => <li key={rule.id} className={rule.test(password) ? "is-met" : ""}>{rule.label}</li>)}
                </ul>
              )}
            </>
          )}

          {error && <p className="form-message error" role="alert">{error}</p>}
          {needsConfirmation && <button className="inline-link-button" type="button" onClick={resendConfirmation} disabled={busy}>Resend confirmation email</button>}
          {message && <p className="form-message" role="status">{message}</p>}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : "Email me a link"}
          </button>
        </form>
      </section>
    </AuthShell>
  );
}
