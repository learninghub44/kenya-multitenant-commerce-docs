import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../marketing.module.css";
import support from "../../support.module.css";

export const metadata: Metadata = {
  title: "Support | Commerce Workspace",
  description: "Contact the Commerce Workspace support team by phone or email."
};

export default function SupportPage() {
  return <div className={styles.container}>
    <section className={styles.hero}>
      <p className={styles.eyebrow}>Help and support</p>
      <h1>Real help when you need it.</h1>
      <p className={styles.lead}>Talk to our support team about account access, setting up your workspace, products, stock, order requests or using the dashboard.</p>
    </section>
    <section className={support.supportGrid} aria-label="Contact support">
      <article className={support.supportCard}>
        <span className={support.supportIcon} aria-hidden="true">☎</span>
        <div><p className={support.supportLabel}>Call our team</p><h2>Speak to support</h2><p>Choose either support line. If one line is unavailable, try the other.</p></div>
        <a href="tel:+254701059192">+254 701 059 192</a><a href="tel:+254101024580">+254 101 024 580</a>
      </article>
      <article className={support.supportCard}>
        <span className={support.supportIcon} aria-hidden="true">✉</span>
        <div><p className={support.supportLabel}>Email support</p><h2>Send us a message</h2><p>Describe what you were doing and include any non-sensitive error message you can see.</p></div>
        <a href="mailto:support@christech.co.ke">support@christech.co.ke</a>
      </article>
    </section>
    <section className={styles.section}>
      <h2>What to include when asking for help</h2>
      <ul><li>The email address used for your account (never send your password).</li><li>Your business workspace name and the page where the issue appears.</li><li>What you expected to happen and what happened instead.</li><li>A screenshot of the error, after hiding customer or payment-sensitive information.</li></ul>
      <div className={styles.notice}>Never share your password, one-time login code, M-PESA PIN, card details or other payment credentials with support.</div>
      <div className={styles.actions}><Link className={styles.primary} href="/login">Open your workspace</Link><Link className={styles.secondary} href="/features">Explore features</Link></div>
    </section>
  </div>;
}
