import LoginForm from "./login-form";

export default function LoginPage() {
  return <main className="admin-login"><div className="panel stack">
    <div><p className="admin-kicker">Restricted access</p><h1>Platform sign in</h1><p className="muted">Use your approved platform operator account.</p></div>
    <LoginForm />
    <p className="muted">Access requires an active platform-admin record and verified authenticator MFA.</p>
  </div></main>;
}
