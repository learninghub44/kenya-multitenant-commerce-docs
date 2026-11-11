import type { Metadata } from "next";
import styles from "../../marketing.module.css";

export const metadata: Metadata = {
  title: "Privacy notice | Commerce Workspace",
  description: "A plain-language overview of information handled by Commerce Workspace. This draft requires legal review.",
  robots: { index: false, follow: false }
};

export default function PrivacyPage() {
  return (
    <div className={styles.container}><article className={styles.prose}>
      <p className={styles.eyebrow}>Legal information</p>
      <h1>Privacy notice</h1>
      <div className={styles.notice}>Draft notice for product review only. This is not a final legal policy. The operator’s legal identity, contact details, retention periods, processors and applicable legal bases must be confirmed by the business and qualified Kenyan counsel before launch.</div>
      <p>This notice describes, at a high level, the types of information a commerce workspace may handle when merchants create accounts, manage stores and receive customer order requests.</p>
      <h2>Information that may be handled</h2>
      <p>Account and profile details; business and storefront information; product catalogue data; staff membership and permission records; customer names and contact details supplied with order requests; delivery details supplied by customers; order history; support communications; and technical security logs.</p>
      <h2>Why information is used</h2>
      <p>To provide account access, operate merchant workspaces, display storefronts, transmit customer order requests to the relevant merchant, protect the service, provide support and meet applicable recordkeeping obligations.</p>
      <h2>Sharing and access</h2>
      <p>Customer order details are made available to the merchant receiving the request. Service providers may process information to host, secure and operate the service under appropriate arrangements. Access should be limited to authorised personnel and logged where appropriate.</p>
      <h2>Payments</h2>
      <p>The current storefront is an order-request experience and does not collect online payments. Do not submit M-PESA PINs, card numbers or other payment secrets through product forms or order messages.</p>
      <h2>Retention and your choices</h2>
      <p>Retention periods and processes for access, correction, deletion, objection and other data-subject requests must be confirmed and published by the operator before launch. Contact the business operating your workspace for questions about information it controls.</p>
      <h2>Security and updates</h2>
      <p>Reasonable technical and organisational safeguards should protect information. No online service can guarantee absolute security. This draft must be replaced with a reviewed notice containing verified operator and contact details before public production use.</p>
    </article></div>
  );
}
