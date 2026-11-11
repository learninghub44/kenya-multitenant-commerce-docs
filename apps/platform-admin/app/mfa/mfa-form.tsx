"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Stage = "loading" | "enroll" | "verify" | "error";

export default function MfaForm() {
  const router = useRouter();
  const [stage,setStage] = useState<Stage>("loading");
  const [factorId,setFactorId] = useState("");
  const [qrCode,setQrCode] = useState("");
  const [secret,setSecret] = useState("");
  const [code,setCode] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function prepare() {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.replace("/login"); return; }
      const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      if (assurance.currentLevel === "aal2") { router.replace("/"); return; }
      const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
      if (factorError) throw factorError;
      const verified = factors.totp.find(item => item.status === "verified");
      if (verified) {
        if (!cancelled) { setFactorId(verified.id); setStage("verify"); }
        return;
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Platform admin authenticator" });
      if (enrollError) throw enrollError;
      if (!cancelled) {
        setFactorId(enrolled.id);
        setQrCode(enrolled.totp.qr_code);
        setSecret(enrolled.totp.secret);
        setStage("enroll");
      }
    }
    prepare().catch(cause => { if (!cancelled) { setError(cause instanceof Error ? cause.message : "Could not prepare MFA."); setStage("error"); } });
    return () => { cancelled = true; };
  }, [router]);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const { error: verifyError } = await createSupabaseBrowserClient().auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
      if (verifyError) throw verifyError;
      router.replace("/"); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The authenticator code was not accepted.");
    } finally { setBusy(false); }
  }

  return <>
    {stage === "loading" && <p className="muted" role="status">Preparing your authenticator…</p>}
    {stage === "enroll" && <div className="stack">
      <p>Scan this QR code with an authenticator app, or enter the setup key manually.</p>
      {qrCode && <img className="qr" src={qrCode} alt="Authenticator setup QR code" />}
      <p className="secret">{secret}</p>
      <p className="muted">Keep the setup key private. Do not send it to anyone.</p>
      <form className="admin-form" onSubmit={verify}>
        <label>Six-digit authenticator code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,"").slice(0,6))} /></label>
        {error && <p className="admin-message error" role="alert">{error}</p>}
        <button className="button button-primary" disabled={busy}>{busy ? "Verifying…" : "Verify and enable MFA"}</button>
      </form>
    </div>}
    {stage === "verify" && <form className="admin-form" onSubmit={verify}>
      <p>Enter the current six-digit code from your registered authenticator app.</p>
      <label>Authenticator code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,"").slice(0,6))} /></label>
      {error && <p className="admin-message error" role="alert">{error}</p>}
      <button className="button button-primary" disabled={busy}>{busy ? "Verifying…" : "Verify MFA"}</button>
    </form>}
    {stage === "error" && <p className="admin-message error" role="alert">{error}</p>}
    <Link href="/login">Back to sign in</Link>
  </>;
}
