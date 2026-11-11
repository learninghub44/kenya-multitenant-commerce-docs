import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../marketing.module.css";

export const metadata: Metadata = {
  title: "How it works | Commerce Workspace",
  description: "Set up a business workspace, publish products and manage customer order requests."
};

const steps = [
  ["Create your workspace", "Register, choose a workspace name and complete the business setup details."],
  ["Add your products", "Create product listings with accurate descriptions, prices and available stock. Publish only what you want customers to browse."],
  ["Share your storefront", "Send your store link to customers so they can view your catalogue and submit an order request."],
  ["Review and fulfil requests", "Check each request, contact the customer to confirm availability, delivery and payment arrangements, then update its progress."]
];

export default function HowItWorksPage() {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>A straightforward workflow</p>
        <h1>From product list to customer request.</h1>
        <p className={styles.lead}>Set up your online catalogue, share it with customers and handle incoming requests from your business workspace.</p>
      </section>
      <section className={styles.grid}>
        {steps.map(([title,description],index) => <article className={styles.card} key={title}><p className={styles.eyebrow}>Step {index+1}</p><h2>{title}</h2><p>{description}</p></article>)}
      </section>
      <section className={styles.section}>
        <h2>How payment works today</h2>
        <p>The storefront does not currently collect online payments or confirm M-PESA/card transactions. The merchant contacts the customer to agree on a payment method and verifies payment independently. Do not treat an order request as a paid order.</p>
        <div className={styles.notice}>Payment integrations are not available in this release. We will update this page if supported online payment options become available.</div>
        <Link className={styles.primary} href="/register">Set up your workspace</Link>
      </section>
    </div>
  );
}
