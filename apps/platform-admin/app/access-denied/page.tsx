import Link from "next/link";

export default function AccessDeniedPage() {
  return <main className="admin-login"><section className="panel stack">
    <p className="admin-kicker">Access restricted</p><h1>No platform access</h1>
    <p className="muted">Your account does not have an active platform-operator grant. Tenant membership alone does not grant access to this console.</p>
    <Link href="/login">Return to sign in</Link>
  </section></main>;
}
