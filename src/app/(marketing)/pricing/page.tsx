import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../marketing.module.css";

export const metadata: Metadata = {
  title: "Pricing | Commerce Workspace",
  description: "Get in touch about access and workspace plans for Commerce Workspace."
};

export default function PricingPage() {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Plans and access</p>
        <h1>Clear information before you commit.</h1>
        <p className={styles.lead}>We are preparing the product and its commercial plans. No unverified prices or feature promises are published here.</p>
        <div className={styles.card}>
          <h2>Early access</h2>
          <p>Create an account to explore the current workspace experience. Availability of individual features may depend on the release stage.</p>
          <p>There is no online payment processing in the current storefront release.</p>
          <div className={styles.actions}><Link className={styles.primary} href="/register">Create an account</Link><Link className={styles.secondary} href="/features">Review features</Link></div>
        </div>
      </section>
    </div>
  );
}
