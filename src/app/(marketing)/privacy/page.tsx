import type { Metadata } from "next";
import styles from "../../marketing.module.css";

export const metadata: Metadata = {
  title: "Privacy Notice | Commerce Workspace",
  description: "How Commerce Workspace collects, uses, shares and protects personal information."
};

export default function PrivacyPage() {
  return (
    <div className={styles.container}>
      <article className={styles.prose}>
        <p className={styles.eyebrow}>Legal · Last updated 11 November 2026</p>
        <h1>Privacy Notice</h1>
        <p>This notice explains how Commerce Workspace handles personal information when you visit our website, create an account, manage a business workspace or place an order request through a merchant’s storefront. It is intended to be read together with our <a href="/terms">Terms of Service</a>.</p>

        <h2>1. Who we are</h2>
        <p>Commerce Workspace is operated by Zetu Business Solutions (“we”, “us” or “our”) in Kenya. For privacy questions or requests, contact <a href="mailto:support@christech.co.ke">support@christech.co.ke</a>, +254 701 059 192 or +254 101 024 580. This contact is also the point for directing a request to the appropriate merchant where the merchant controls the information.</p>

        <h2>2. Our role and the merchant’s role</h2>
        <p>For account registration, authentication, service administration, platform security and our own support communications, we determine the purposes and means of processing and act as a data controller.</p>
        <p>When a customer submits an order request to a merchant, the merchant generally decides why customer information is collected and how it is used to fulfil the sale. The merchant is responsible for its customer privacy notice, lawful basis, customer communications, retention and responses to rights requests. We process that information to provide the storefront, transmit the request and operate the merchant workspace. In that context, we generally act as the merchant’s data processor, subject to the applicable agreement and the merchant’s lawful instructions.</p>
        <p>If you are a customer, contact the merchant named on the storefront first about an order or the use of information for that merchant’s business. You may also contact us and we will help route the request where appropriate.</p>

        <h2>3. Information we may collect</h2>
        <ul>
          <li><strong>Account information:</strong> name or account profile details, email address, authentication identifiers and sign-in status.</li>
          <li><strong>Business workspace information:</strong> business name, store name or web address, business contact details, staff membership, roles and workspace settings.</li>
          <li><strong>Store and product information:</strong> product names, descriptions, prices, images, categories, variants and stock records. These may identify a sole trader or staff member when they include personal contact details.</li>
          <li><strong>Order-request information:</strong> customer name, contact details, delivery or collection information supplied by the customer, items requested, order totals, order status and messages or notes entered for the order.</li>
          <li><strong>Business records:</strong> customer and supplier records, purchase information, expenses, stock movements and reports entered by authorised workspace users.</li>
          <li><strong>Support information:</strong> messages you send us, the issue you report and any screenshots or files you choose to provide.</li>
          <li><strong>Technical information:</strong> device and browser details, IP address, session and security events, timestamps and diagnostic information needed to operate and protect the service.</li>
        </ul>
        <p>Please do not submit sensitive personal information unless it is strictly necessary and you have a lawful basis to do so. Never submit passwords, one-time passcodes, M-PESA PINs, card security codes or other payment credentials.</p>

        <h2>4. How information is collected</h2>
        <p>We collect information directly when you register, sign in, configure a workspace, add business records, contact support or use a storefront. Some profile information may be received from an identity provider if you choose an available third-party sign-in option. Technical information may be generated automatically when your browser connects to the service. Merchants may also enter customer or staff information into their workspace.</p>

        <h2>5. Why we use information</h2>
        <ul>
          <li>to create and secure accounts, authenticate users and administer workspace access;</li>
          <li>to provide storefronts, transmit customer order requests and display business records to authorised users;</li>
          <li>to maintain stock, order, purchasing, expense and reporting functions requested by the merchant;</li>
          <li>to respond to support requests, investigate errors and communicate service notices;</li>
          <li>to detect abuse, protect accounts, enforce our Terms and maintain service integrity;</li>
          <li>to comply with legal obligations, resolve disputes and establish or defend legal claims; and</li>
          <li>to improve reliability and usability using information that is appropriate and proportionate for that purpose.</li>
        </ul>

        <h2>6. Our lawful bases</h2>
        <p>Where the Kenya Data Protection Act, 2019 applies, we rely on the lawful basis appropriate to the activity. This may include performing a contract with you or taking steps at your request before a contract; complying with a legal obligation; pursuing legitimate interests such as service security, fraud prevention and support where those interests are not overridden by your rights; or consent where consent is required. A merchant is responsible for identifying and documenting the lawful basis for the customer and staff information it controls.</p>

        <h2>7. When information is shared</h2>
        <p>We do not sell personal information. Information may be shared only where reasonably necessary for the purposes described in this notice:</p>
        <ul>
          <li><strong>With the relevant merchant:</strong> a customer’s order request and the details needed to review and fulfil it are made available to that merchant and authorised workspace staff.</li>
          <li><strong>With service providers:</strong> providers that support application hosting, database and authentication, image storage, security and technical operations may process information on our behalf under appropriate arrangements.</li>
          <li><strong>For legal and safety reasons:</strong> where disclosure is required by law, court order or a lawful request, or is reasonably necessary to protect people, rights, property or the security of the service.</li>
          <li><strong>Business changes:</strong> where information is involved in a proposed or completed merger, restructuring or transfer, subject to applicable privacy requirements.</li>
        </ul>

        <h2>8. Service providers and transfers outside Kenya</h2>
        <p>Commerce Workspace uses third-party technology to operate the service, including Supabase for database and authentication services and Cloudinary for product image handling. The application may be hosted on Cloudflare infrastructure. Depending on provider configuration and service location, information may be processed or stored outside Kenya. Where personal information is transferred outside Kenya, we will use a transfer mechanism and safeguards required by Kenyan law, and obtain consent where the law requires it. Contact us if you need further information about a particular transfer or provider.</p>

        <h2>9. Cookies and session technologies</h2>
        <p>The service uses essential session and authentication technologies so that sign-in works, protected pages remain protected and your workspace can recognise your session. These technologies are necessary to provide the service. If optional analytics, advertising or preference cookies are introduced, we will provide appropriate information and obtain consent where required by law. You can manage cookies through your browser, but blocking essential cookies may prevent sign-in or other features from working.</p>

        <h2>10. How long we keep information</h2>
        <p>We keep personal information only for as long as it is reasonably needed for the purpose for which it was collected, including providing the service, maintaining business records, meeting legal obligations, resolving disputes and protecting the service. Account and workspace information is generally retained while the account remains active. Order, financial and business records may need to be kept longer by the merchant to meet tax, accounting, consumer or other legal obligations.</p>
        <p>When information is no longer needed, we take reasonable steps to delete it, anonymise it or securely dispose of it. Some copies may remain temporarily in routine backups or records that must be retained by law. Where a merchant controls the information, the merchant is responsible for deciding and applying its retention schedule, subject to applicable law.</p>

        <h2>11. Security</h2>
        <p>We use reasonable technical and organisational measures designed to protect information against unauthorised access, loss, alteration or disclosure. These measures include access controls, authentication, tenant separation, restricted handling of privileged credentials and secure connections. No internet service can guarantee absolute security. You must protect your account, use appropriate staff permissions and tell us promptly if you suspect an account or data incident.</p>

        <h2>12. Your privacy rights</h2>
        <p>Subject to the conditions and exemptions in applicable law, you may have the right to be informed about the use of your information, request access, object to processing, request correction of inaccurate information, request deletion or restriction, request portability where applicable, and withdraw consent where processing is based on consent. These rights are not absolute and some information may need to be retained for legal obligations, security or the establishment or defence of legal claims.</p>
        <p>To make a request, email <a href="mailto:support@christech.co.ke">support@christech.co.ke</a> with the subject “Privacy request”. Tell us what right you want to exercise and which account, workspace or order is involved. We may ask for reasonable information to verify your identity or authority before acting. We will respond within the time required by applicable law. If the information relates to a merchant’s customer records, we may refer the request to that merchant or assist the merchant in responding.</p>
        <p>You may also raise a complaint with the Office of the Data Protection Commissioner in Kenya. Information about the regulator and applicable rights is available at <a href="https://www.odpc.go.ke/" target="_blank" rel="noreferrer">odpc.go.ke</a>.</p>

        <h2>13. Children</h2>
        <p>Commerce Workspace business accounts are intended for people aged 18 or older. The service is not designed for children to create accounts or submit personal information independently. If you believe a child has provided personal information to us, contact support so we can review the request.</p>

        <h2>14. Automated decisions</h2>
        <p>The service provides business records and workflow tools. We do not intend to make decisions about individuals that produce legal or similarly significant effects solely through automated processing. If this changes, we will update this notice and provide any explanation or rights required by law.</p>

        <h2>15. Changes to this notice</h2>
        <p>We may update this notice when our service, providers or legal obligations change. The date at the top shows when it was last updated. If a change materially affects how personal information is used, we will take reasonable steps to bring it to your attention and obtain consent where required.</p>

        <h2>16. Contact us</h2>
        <p>For privacy questions or requests, contact Zetu Business Solutions at <a href="mailto:support@christech.co.ke">support@christech.co.ke</a>, +254 701 059 192 or +254 101 024 580. Please do not include passwords, PINs, one-time codes or unnecessary sensitive information in your message.</p>
      </article>
    </div>
  );
}
