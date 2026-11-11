import Link from "next/link";
import styles from "../../../support.module.css";

export const metadata = {
  title: "Support | Business workspace",
  description: "Contact support for help with your business workspace."
};

export default function WorkspaceSupportPage() {
  return <section className="dashboard-page">
    <p className="eyebrow">Help and support</p>
    <h1>How can we help?</h1>
    <p className="auth-description">Contact our support team for help with your workspace, catalogue, inventory, orders or account access.</p>
    <div className={styles.supportGrid} style={{ marginTop: 28 }}>
      <article className={styles.supportCard}>
        <span className={styles.supportIcon} aria-hidden="true">☎</span>
        <div><p className={styles.supportLabel}>Phone support</p><h2>Call our team</h2><p>If one line is unavailable, try the other number.</p></div>
        <a href="tel:+254701059192">+254 701 059 192</a><a href="tel:+254101024580">+254 101 024 580</a>
      </article>
      <article className={styles.supportCard}>
        <span className={styles.supportIcon} aria-hidden="true">✉</span>
        <div><p className={styles.supportLabel}>Email support</p><h2>Send an email</h2><p>Tell us which page you were using and what went wrong.</p></div>
        <a href="mailto:support@christech.co.ke">support@christech.co.ke</a>
      </article>
    </div>
    <div className="empty-state"><h2>Keep your account safe</h2><p>Support will never need your password, one-time login code, M-PESA PIN or card details. Hide customer details before sending screenshots.</p><Link className="workspace-action" href="/dashboard">Back to your businesses</Link></div>
  </section>;
}
