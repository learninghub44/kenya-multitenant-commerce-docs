import type { Metadata } from "next";
import styles from "../../marketing.module.css";

export const metadata: Metadata = {
  title: "Terms of use | Commerce Workspace",
  description: "Draft terms for the Commerce Workspace service. Legal review is required before launch."
};

export default function TermsPage() {
  return (
    <div className={styles.container}><article className={styles.prose}>
      <p className={styles.eyebrow}>Legal information</p>
      <h1>Terms of use</h1>
      <div className={styles.notice}>Draft terms for product review only. These are not final contractual terms. Confirm the service operator’s legal identity, governing law, commercial terms, liability provisions and dispute process with qualified counsel before launch.</div>
      <h2>Using the service</h2>
      <p>Commerce Workspace is intended to help businesses manage product catalogues, stock information, customer order requests and related business records. Users must provide accurate account information, protect their credentials and use the service lawfully.</p>
      <h2>Merchant responsibilities</h2>
      <p>Merchants are responsible for the accuracy of product descriptions, prices, stock availability, delivery terms, customer communications, taxes, consumer disclosures and fulfilment. Merchants must have a lawful basis to provide customer information to the service.</p>
      <h2>Order requests are not payment confirmation</h2>
      <p>The current storefront lets customers submit order requests. It does not process or confirm online payments. A request is not proof that an order has been accepted, paid or fulfilled. Merchants must communicate directly with customers to confirm availability, payment arrangements and fulfilment.</p>
      <h2>Acceptable use</h2>
      <p>Do not misuse the service, attempt unauthorised access, interfere with its operation, upload unlawful content or use another person’s information without authority. Access may be restricted where necessary to protect users or the service, subject to applicable law and reviewed procedures.</p>
      <h2>Availability and changes</h2>
      <p>Features may change as the product develops. The operator must publish final service availability, support, suspension, termination, fees and notice procedures before commercial launch.</p>
      <h2>Contact and disputes</h2>
      <p>The operator’s verified legal name, contact address, governing law and dispute-resolution process must be inserted and reviewed before these terms are used as a binding agreement.</p>
    </article></div>
  );
}
