import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../marketing.module.css";

export const metadata: Metadata = {
  title: "Features | Commerce Workspace",
  description: "Explore product catalogues, stock tracking, order requests and practical retail operations tools."
};

const features = [
  ["Product catalogue", "Create and organise products with descriptions, prices, photos and variants. Publish the items you are ready to show customers."],
  ["Stock visibility", "Record stock movements and review available quantities. Keep an operational view of what has changed and why."],
  ["Order requests", "Receive customer requests in one workspace, review the details and manage fulfilment with your team."],
  ["Business records", "Keep customer, supplier, purchase and expense information alongside everyday store operations."],
  ["Team roles", "Give staff access according to their responsibilities, rather than sharing one owner account."],
  ["Storefront", "Share a public store page where customers can browse your published catalogue and send an order request."]
];

export default function FeaturesPage() {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Product features</p>
        <h1>Simple tools for the work behind every sale.</h1>
        <p className={styles.lead}>Bring your catalogue, stock, customer requests and day-to-day records into one place. Start with the essentials and build a clearer picture of your operations.</p>
        <div className={styles.notice}>Important: the current storefront supports order requests, not integrated online payment collection. Customers and merchants arrange payment directly.</div>
        <div className={styles.actions}><Link className={styles.primary} href="/register">Create a workspace</Link><Link className={styles.secondary} href="/how-it-works">See how it works</Link></div>
      </section>
      <section className={styles.grid} aria-label="Product capabilities">
        {features.map(([title,description]) => <article className={styles.card} key={title}><h2>{title}</h2><p>{description}</p></article>)}
      </section>
    </div>
  );
}
