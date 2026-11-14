"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PASSWORD_RULES, friendlyAuthError, getSafeNextPath, normalizeKenyanPhone, passwordProblem } from "@/lib/auth-helpers";

type Variant = "register" | "login";

const CALLBACK_ERRORS: Record<string, string> = {
  cancelled: "Sign-in was cancelled. You can try again.",
  link_expired: "That link has expired or was already used. Request a new one.",
  link_invalid: "That link is not valid. Request a new one.",
  unavailable: "Sign-in is temporarily unavailable. Please try again shortly.",
};

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function AuthForm({ variant }: { variant: Variant }) {
  const router = useRouter();
  const isRegister = variant === "register";
  const [useLink, setUseLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const nextQuery = () => {
    const next = new URLSearchParams(window.location.search).get("next");
    return next ? `?next=${encodeURIComponent(next)}` : "";
  };
  const [otherHref, setOtherHref] = useState(isRegister ? "/login" : "/register");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackError = params.get("error");
    if (callbackError) setError(CALLBACK_ERRORS[callbackError] ?? "Sign-in failed. Please try again.");
    setOtherHref(`${isRegister ? "/login" : "/register"}${nextQuery()}`);

    // A signed-in visitor has nothing to do here.
    (async () => {
      try {
        const { data } = await createSupabaseBrowserClient().auth.getUser();
        if (data.user) router.replace(getSafeNextPath(params.get("next"), window.location.origin));
      } catch {
        // No session or Supabase not reachable: stay on the form.
      }
    })();
  }, [router, isRegister]);

  function callbackUrl() {
    const next = getSafeNextPath(new URLSearchParams(window.location.search).get("next"), window.location.origin);
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function continueWithGoogle() {
    setBusy(true); setError(""); setMessage("");
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
    setBusy(true); setError("");
    try {
      const { error: resendError } = await createSupabaseBrowserClient().auth.resend({
        type: "signup", email: email.trim(), options: { emailRedirectTo: callbackUrl() },
      });
      if (resendError) throw resendError;
      setNeedsConfirmation(false);
      setMessage("We sent a new confirmation email. Check your inbox and spam folder.");
    } catch (cause) {
      setError(friendlyAuthError(cause instanceof Error ? cause.message : "").text);
    } finally { setBusy(false); }
  }

  async function resendMagicLink() {
    setBusy(true);
    setError("");
    try {
      const { error: otpError } = await createSupabaseBrowserClient().auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: callbackUrl(), shouldCreateUser: false },
      });
      if (otpError) throw otpError;
    } catch (cause) {
      setError(friendlyAuthError(cause instanceof Error ? cause.message : "").text);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage(""); setNeedsConfirmation(false); setLinkSent(false);
    try {
      const supabase = createSupabaseBrowserClient();
      const cleanEmail = email.trim().toLowerCase();

      if (!isRegister && useLink) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: cleanEmail, options: { emailRedirectTo: callbackUrl(), shouldCreateUser: false },
        });
        if (otpError) throw otpError;
        setLinkSent(true);
        return;
      }

      if (isRegister) {
        const cleanName = fullName.trim();
        if (cleanName.length < 2 || cleanName.length > 120) throw new Error("__validation:Enter your full name.");
        if (password !== confirmPassword) throw new Error("__validation:Your passwords do not match.");
        const problem = passwordProblem(password);
        if (problem) throw new Error(`__validation:${problem}`);
        let normalizedPhone: string | undefined;
        if (phone.trim()) {
          const parsed = normalizeKenyanPhone(phone);
          if (!parsed) throw new Error("__validation:Enter a Kenyan phone number like 712 345 678.");
          normalizedPhone = parsed;
        }
        const result = await supabase.auth.signUp({
          email: cleanEmail, password,
          options: { emailRedirectTo: callbackUrl(), data: { full_name: cleanName, ...(normalizedPhone ? { phone: normalizedPhone } : {}) } },
        });
        if (result.error) throw result.error;
        if (!result.data.session) {
          // Same message whether or not the address already has an account.
          setMessage("Almost done. Check your email to confirm your account, then sign in.");
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
    } finally { setBusy(false); }
  }

  const metCount = PASSWORD_RULES.filter(rule => rule.test(password)).length;

  return (
    <section className={`auth-card auth-card-figma ${isRegister ? "is-register" : "is-login"}`} aria-labelledby="auth-title">
      <div className="auth-pattern" aria-hidden="true" />
      <div className="auth-form-content">
        <h1 id="auth-title">{linkSent ? "Check your inbox" : isRegister ? "Sign up" : "Sign in"}</h1>
        {linkSent ? (
          <div className="auth-email-sent" role="status" aria-live="polite">
            <div className="auth-email-sent-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><rect x="5" y="10" width="38" height="28" rx="6" stroke="currentColor" strokeWidth="2.5"/><path d="m8 14 16 13 16-13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="m31 32 4 4 8-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
            <p className="auth-email-sent-lead">We have sent a secure sign-in link to</p>
            <strong className="auth-email-address">{email.trim().toLowerCase()}</strong>
            <p className="auth-email-sent-help">Open the email on this device and follow the link to sign in. If it is not in your inbox, check spam or promotions.</p>
            {error && <p className="form-message error" role="alert">{error}</p>}
            <button className="primary-button figma-submit" type="button" onClick={resendMagicLink} disabled={busy}>{busy ? "Sending…" : "Send another link"}</button>
            <button className="auth-email-edit" type="button" onClick={() => { setLinkSent(false); setError(""); setUseLink(true); }}>Use a different email</button>
          </div>
        ) : (
        <form onSubmit={submit}>
          {isRegister && <div className="figma-field"><label htmlFor="full-name">Full name</label><div className="figma-input-wrap"><span className="figma-field-icon" aria-hidden="true">♙</span><input id="full-name" autoComplete="name" required minLength={2} maxLength={120} placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} /></div></div>}
          <div className="figma-field"><label htmlFor="email">Email</label><div className="figma-input-wrap"><span className="figma-field-icon" aria-hidden="true">✉</span><input id="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></div></div>
          {isRegister && <div className="figma-field"><label htmlFor="phone">Phone</label><div className="figma-input-wrap"><span className="figma-field-icon" aria-hidden="true">⌕</span><span className="figma-phone-prefix">+254</span><input id="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="712 345 678" maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} /></div></div>}
          {(isRegister || !useLink) && <div className="figma-field"><label htmlFor="password">Password</label><div className="figma-input-wrap"><span className="figma-field-icon" aria-hidden="true">♙</span><input id="password" type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} required minLength={isRegister ? 8 : 1} maxLength={128} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} /><button className="figma-eye" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "◉"}</button></div>
          {isRegister && <><div className={`strength strength-${metCount}`} aria-hidden="true"><i /><i /><i /></div><ul className="password-rules" aria-label="Password requirements">{PASSWORD_RULES.map(rule => <li key={rule.id} className={rule.test(password) ? "is-met" : ""}>{rule.label}</li>)}</ul></>}</div>}
          {isRegister && <div className="figma-field"><label htmlFor="confirm-password">Confirm Password</label><div className="figma-input-wrap"><span className="figma-field-icon" aria-hidden="true">♙</span><input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Confirm your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div></div>}
          {!isRegister && !useLink && <div className="figma-login-options"><label className="figma-remember"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /><span>Remember Me</span></label><Link href="/auth/forgot-password">Forgot Password?</Link></div>}
          {error && <p className="form-message error" role="alert">{error}</p>}
          {needsConfirmation && <button className="inline-link-button" type="button" onClick={resendConfirmation} disabled={busy}>Resend confirmation email</button>}
          {message && <p className="form-message" role="status">{message}</p>}
          <button className="primary-button figma-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : isRegister ? "Sign up" : useLink ? "Email me a sign-in link" : "Sign in"}</button>
        </form>
        )}
        {!linkSent && <div className="figma-footer"><p>{isRegister ? "Already have an Account!" : "Don’t have an Account ?"} <Link href={otherHref}>{isRegister ? "Sign in" : "Sign up"}</Link></p><button className="figma-google" type="button" onClick={continueWithGoogle} disabled={busy}><GoogleIcon /> Continue with Google</button>{!isRegister && <button className="figma-magic-link" type="button" onClick={() => { setUseLink(value => !value); setError(""); setMessage(""); }}>{useLink ? "Use my password instead" : "Use an email sign-in link"}</button>}</div>}
        {linkSent && <p className="auth-email-back"><Link href="/login">Back to sign in</Link></p>}
      </div>
    </section>
  );
}
