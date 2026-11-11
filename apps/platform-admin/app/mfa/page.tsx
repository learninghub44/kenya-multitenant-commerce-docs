import MfaForm from "./mfa-form";

export default function MfaPage() {
  return <main className="admin-login"><div className="panel stack">
    <div><p className="admin-kicker">Required security step</p><h1>Authenticator verification</h1><p className="muted">Platform access requires Supabase MFA assurance level AAL2.</p></div>
    <MfaForm />
  </div></main>;
}
