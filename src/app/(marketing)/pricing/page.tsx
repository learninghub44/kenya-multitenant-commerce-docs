import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../marketing.module.css";

export const metadata: Metadata = {
  title: "Pricing | Commerce Workspace",
  description: "Ask about Commerce Workspace access and current plans."
};

export default function PricingPage() {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Pricing</p>
        <h1>Simple plans. No surprises.</h1>
        <p className={styles.lead}>Plans and pricing are being finalised. Contact our team for current access and availability.</p>
        <div className={styles.actions}>
          <a className={styles.primary} href="mailto:support@christech.co.ke">Contact support</a>
          <Link className={styles.secondary} href="/features">View features</Link>
        </div>
      </section>
    </div>
  );
}
