import type { Metadata } from "next";
import styles from "../../marketing.module.css";

export const metadata: Metadata = {
  title: "Terms of Service | Commerce Workspace",
  description: "The terms that apply when you use Commerce Workspace."
};

export default function TermsPage() {
  return (
    <div className={styles.container}>
      <article className={styles.prose}>
        <p className={styles.eyebrow}>Legal · Last updated 11 November 2026</p>
        <h1>Terms of Service</h1>
        <p>These Terms govern access to and use of Commerce Workspace, including its business dashboard and public storefront tools. By creating an account, accepting an invitation or using the service, you agree to these Terms.</p>

        <h2>1. Who provides the service</h2>
        <p>Commerce Workspace is operated by Zetu Business Solutions (“we”, “us” or “our”), Kenya. References to Commerce Workspace mean the software, websites, dashboards and related services that we make available. You can contact us at <a href="mailto:support@christech.co.ke">support@christech.co.ke</a> or +254 701 059 192 / +254 101 024 580.</p>

        <h2>2. Who may use it</h2>
        <p>You must be at least 18 years old and legally able to enter into an agreement. If you create or manage a workspace for a business, you confirm that you are authorised to act for that business and to accept these Terms on its behalf. Keep your registration and business details accurate and up to date.</p>

        <h2>3. Your account and workspace</h2>
        <ul>
          <li>Keep your sign-in details confidential and use a separate account for each authorised team member.</li>
          <li>You are responsible for activity carried out through your account, except where caused by our failure to meet a legal duty.</li>
          <li>Give each team member only the access they need and remove access when their role ends.</li>
          <li>Tell us promptly if you suspect unauthorised access, account compromise or a security issue.</li>
          <li>Do not share accounts, bypass permissions or attempt to access another business’s workspace or information.</li>
        </ul>

        <h2>4. What the service does</h2>
        <p>Commerce Workspace provides tools that may include product catalogues, public storefronts, stock records, customer order requests, order management, staff permissions, purchasing, expenses and reports. Features can vary by plan, account, release stage and availability. We may add, change or retire features, but will take reasonable steps to give notice where a material change affects your use.</p>

        <h2>5. Storefronts and customer orders</h2>
        <p>A customer submitting an order through a storefront sends an order request to the merchant. The request is not, by itself, confirmation that the merchant has accepted the order, that stock is reserved indefinitely, or that payment has been made. The merchant must review the request and communicate directly with the customer about acceptance, final price, availability, delivery or collection, returns and payment.</p>
        <p>The merchant and customer are responsible for their own sale and any agreement between them. Commerce Workspace is a software provider and is not the seller, buyer, delivery provider, escrow agent or party to that transaction.</p>

        <h2>6. Payments and money</h2>
        <p>The current storefront experience does not collect or process online payments. Customers and merchants arrange payment directly with each other. A status or note entered by a merchant is an internal business record and is not independent confirmation from a bank, mobile-money provider or payment network. Do not describe an order as paid unless you have independently verified receipt of funds.</p>
        <p>Do not enter or send M-PESA PINs, card security codes, passwords, one-time passcodes or other payment credentials through the service. If payment functionality is introduced later, the applicable payment terms and provider disclosures will be presented before that functionality is used.</p>

        <h2>7. Merchant responsibilities</h2>
        <p>If you operate a store, you are responsible for your business and for all content and transactions associated with it. This includes:</p>
        <ul>
          <li>accurate product descriptions, images, prices, taxes, stock quantities and availability;</li>
          <li>lawful products, licences, permits, consumer disclosures, advertising and business practices;</li>
          <li>confirming orders, communicating with customers, taking payment, issuing receipts and handling delivery, returns, refunds, complaints and warranties;</li>
          <li>your tax, accounting, recordkeeping and regulatory obligations;</li>
          <li>having a lawful basis to collect and share customer and staff information, providing required privacy notices and honouring data-subject rights; and</li>
          <li>ensuring that staff and contractors using your workspace are authorised and follow these Terms.</li>
        </ul>

        <h2>8. Acceptable use</h2>
        <p>You must not use the service to break the law, infringe another person’s rights, deceive customers, distribute harmful code, send unsolicited or unlawful marketing, upload content you do not have rights to use, interfere with service availability, probe or bypass security, scrape protected information, or attempt to access data outside your workspace. You must not use the service to store payment secrets or information that is unnecessary for the stated business purpose.</p>

        <h2>9. Your content and our intellectual property</h2>
        <p>You keep ownership of the business information, product material, images and other content you submit. You give us a limited, non-exclusive permission to host, reproduce, transmit and display that content only as needed to provide, secure and support the service. You confirm that you have the rights and permissions needed to submit it.</p>
        <p>The software, design, branding and service materials are owned by us or our licensors. These Terms do not transfer ownership to you. You may use the service only for your business operations and in accordance with these Terms.</p>

        <h2>10. Plans, fees and cancellation</h2>
        <p>Any applicable subscription, usage fee, tax, billing interval, renewal date and cancellation terms will be shown to you before you make a purchase or commit to a paid plan. No fee is due merely because a price or plan is mentioned in general product information. Unless a mandatory law says otherwise or the applicable offer states otherwise, fees for a period already started are not refundable. You remain responsible for charges incurred before cancellation.</p>

        <h2>11. Third-party services</h2>
        <p>The service may rely on third-party infrastructure and tools, such as database, authentication, hosting and image-storage providers. Their services may have separate terms and privacy practices. We are not responsible for independent services we do not control, but we will take reasonable steps to select and manage providers used to operate Commerce Workspace.</p>

        <h2>12. Availability, suspension and termination</h2>
        <p>We aim to keep the service available and secure, but do not promise uninterrupted or error-free operation. Maintenance, provider outages, connectivity issues, security events or circumstances outside our reasonable control may affect access. We may restrict or suspend access where reasonably necessary to protect users, investigate suspected misuse, comply with law, address non-payment of an agreed fee or prevent harm. Where practicable, we will notify the affected account and allow an opportunity to resolve the issue.</p>
        <p>You may stop using the service and request workspace closure by contacting support. You remain responsible for exporting or retaining business records you need before closure. Data handling after closure is explained in our <a href="/privacy">Privacy Notice</a>.</p>

        <h2>13. Disclaimers</h2>
        <p>Commerce Workspace is a business-management tool, not legal, tax, accounting, financial or professional advice. You must review records and reports before relying on them. We do not guarantee sales, customer demand, stock accuracy where information is entered incorrectly, merchant fulfilment, or the conduct of customers and third parties.</p>

        <h2>14. Liability</h2>
        <p>Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited, including liability for fraud, wilful misconduct or mandatory consumer rights. To the extent permitted by law, we are not liable for indirect or consequential loss, lost profits, lost business opportunities, or loss arising from inaccurate information supplied by you, a customer or another third party. To the extent permitted by law, our total liability arising from the service will not exceed the fees you paid to us for the service in the twelve months before the event giving rise to the claim. This limit does not apply where the law prohibits it.</p>

        <h2>15. Indemnity</h2>
        <p>To the extent permitted by law, you are responsible for claims, losses and reasonable costs arising from your unlawful use of the service, your breach of these Terms, your business operations, or content and customer information you submit, except to the extent caused by our own breach of law or these Terms.</p>

        <h2>16. Privacy and data protection</h2>
        <p>Our <a href="/privacy">Privacy Notice</a> explains how personal information is handled. When you use the service for customer or staff information, you must also comply with applicable data-protection law. Where you determine why and how customer information is used for your business, you are responsible for those decisions. We process that information to provide the workspace and related services, subject to your lawful instructions and applicable law.</p>

        <h2>17. Changes to these Terms</h2>
        <p>We may update these Terms to reflect changes in the service, law or business operations. We will update the date above and give reasonable notice of material changes through the service or by email where appropriate. Continued use after the effective date of an update means you accept the updated Terms, except where applicable law requires another form of consent.</p>

        <h2>18. Governing law and disputes</h2>
        <p>These Terms are governed by the laws of Kenya. If you have a concern, contact us first so we can try to resolve it informally. If it cannot be resolved, the dispute may be brought before the courts with jurisdiction in Kenya, subject to any mandatory dispute-resolution rights or procedures that apply.</p>

        <h2>19. General</h2>
        <p>If a provision is found unenforceable, the remaining provisions continue to apply. A failure to enforce a provision is not a waiver. You may not transfer your account or rights under these Terms without our written consent. We may transfer the service as part of a lawful business reorganisation or transfer, while continuing to protect personal information in accordance with the Privacy Notice and applicable law.</p>

        <h2>20. Contact</h2>
        <p>Questions about these Terms can be sent to <a href="mailto:support@christech.co.ke">support@christech.co.ke</a> or by phone on +254 701 059 192 or +254 101 024 580.</p>
      </article>
    </div>
  );
}
