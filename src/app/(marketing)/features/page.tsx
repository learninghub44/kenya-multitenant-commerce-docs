import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../marketing.module.css";

export const metadata: Metadata = {
  title: "Features | Commerce Workspace",
  description: "Products, stock, orders and business records in one workspace."
};

const features = [
  ["Product catalogue", "Add products, photos, prices and variants. Publish when ready."],
  ["Stock control", "Record stock movements and check available quantities."],
  ["Order requests", "Review customer requests and manage fulfilment."],
  ["Business records", "Keep customer, supplier, purchase and expense records together."],
  ["Team access", "Give staff access that matches their responsibilities."],
  ["Online storefront", "Share your catalogue so customers can browse and send a request."]
];

export default function FeaturesPage() {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Features</p>
        <h1>Everything in its place.</h1>
        <p className={styles.lead}>The tools to manage your shop, stock and daily operations.</p>
        <div className={styles.actions}><Link className={styles.primary} href="/register">Get started</Link><Link className={styles.secondary} href="/how-it-works">How it works</Link></div>
      </section>
      <section className={styles.grid} aria-label="Product features">
        {features.map(([title,description]) => <article className={styles.card} key={title}><h2>{title}</h2><p>{description}</p></article>)}
      </section>
      <p className={styles.paymentNote}>Storefront orders are requests. Payment is arranged directly between the customer and merchant.</p>
    </div>
  );
}
