import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../marketing.module.css";
import support from "../../support.module.css";

export const metadata: Metadata = {
  title: "Support | Commerce Workspace",
  description: "Get help with your Commerce Workspace account."
};

export default function SupportPage() {
  return <div className={styles.container}>
    <section className={styles.hero}>
      <p className={styles.eyebrow}>Support</p>
      <h1>We’re here to help.</h1>
      <p className={styles.lead}>Get help with your account, products, stock or orders.</p>
    </section>
    <section className={support.supportGrid} aria-label="Contact support">
      <article className={support.supportCard}>
        <span className={support.supportIcon} aria-hidden="true">☎</span>
        <div><p className={support.supportLabel}>Phone</p><h2>Call support</h2><p>Try either line.</p></div>
        <a href="tel:+254701059192">+254 701 059 192</a><a href="tel:+254101024580">+254 101 024 580</a>
      </article>
      <article className={support.supportCard}>
        <span className={support.supportIcon} aria-hidden="true">✉</span>
        <div><p className={support.supportLabel}>Email</p><h2>Write to us</h2><p>Tell us briefly what you need help with.</p></div>
        <a href="mailto:support@christech.co.ke">support@christech.co.ke</a>
      </article>
    </section>
    <section className={styles.section}>
      <h2>Protect your account</h2>
      <p>Never share your password, sign-in code, M-PESA PIN or card details. Hide customer information before sending screenshots.</p>
      <div className={styles.actions}><Link className={styles.primary} href="/login">Sign in</Link></div>
    </section>
  </div>;
}
