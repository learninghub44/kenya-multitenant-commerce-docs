import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../marketing.module.css";

export const metadata: Metadata = {
  title: "How it works | Commerce Workspace",
  description: "Set up your workspace, publish products and manage customer requests."
};

const steps = [
  ["Create a workspace", "Register and add your business details."],
  ["Add products", "Enter product details, prices and available stock."],
  ["Share your shop", "Send customers your storefront link."],
  ["Manage requests", "Review orders, confirm details and arrange fulfilment."]
];

export default function HowItWorksPage() {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>How it works</p>
        <h1>Ready in four simple steps.</h1>
        <p className={styles.lead}>Set up your catalogue and manage incoming requests from one workspace.</p>
      </section>
      <section className={styles.grid} aria-label="Getting started">
        {steps.map(([title,description],index) => <article className={styles.card} key={title}><p className={styles.eyebrow}>0{index+1}</p><h2>{title}</h2><p>{description}</p></article>)}
      </section>
      <section className={styles.section}>
        <h2>About payments</h2>
        <p>The storefront collects order requests, not online payments. Customers and merchants arrange payment directly.</p>
        <Link className={styles.primary} href="/register">Create a workspace</Link>
      </section>
    </div>
  );
}
