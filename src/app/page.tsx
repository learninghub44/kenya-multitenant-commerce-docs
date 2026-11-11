import Link from "next/link";
import Logo from "@/components/logo";
import styles from "./home.module.css";

const capabilities = [
  { title: "Online catalogue", description: "Publish products, prices and photos in a shop customers can browse." },
  { title: "Stock control", description: "Track quantities and keep a clear record of stock movements." },
  { title: "Order management", description: "Review customer requests and manage fulfilment with your team." },
  { title: "Business records", description: "Keep customers, suppliers, purchases and expenses together." },
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <Logo href="/" size={44} />
        <nav aria-label="Main navigation">
          <Link href="/features">Features</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/support">Support</Link>
          <Link className={styles.navSignIn} href="/login">Sign in</Link>
          <Link className={styles.navCta} href="/register">Get started</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Built for growing businesses</p>
          <h1>Run your shop from one place.</h1>
          <p className={styles.heroDescription}>Manage products, stock, customer orders and everyday business records in one simple workspace.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href="/register">Create your workspace</Link>
            <Link className={styles.textCta} href="#features">Explore features</Link>
          </div>
        </div>
        <div className={styles.preview} role="img" aria-label="Preview of the business workspace showing products, orders and stock">
          <div className={styles.previewTop}><span /><span /><span /><b>Business overview</b></div>
          <div className={styles.previewBody}>
            <div className={styles.previewTiles}>
              <div><small>Products</small><strong>Catalogue</strong><span>Photos and prices</span></div>
              <div><small>Orders</small><strong>One inbox</strong><span>Requests and fulfilment</span></div>
            </div>
            <ul className={styles.previewList}>
              <li><i className={styles.swatchSand} /><span><b>Product catalogue</b><small>Products and variants</small></span></li>
              <li><i className={styles.swatchSage} /><span><b>Stock and orders</b><small>Inventory and fulfilment</small></span></li>
              <li><i className={styles.swatchSun} /><span><b>Business records</b><small>Customers and expenses</small></span></li>
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.features} id="features">
        <div className={styles.sectionIntro}>
          <h2>The essentials, organised.</h2>
          <p>Everything your team needs for day-to-day store operations.</p>
        </div>
        <div className={styles.featureGrid}>
          {capabilities.map((item) => (
            <article className={styles.featureCard} key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
        <p className={styles.paymentNote}>Storefront orders are requests. Customers arrange payment directly with the merchant.</p>
      </section>

      <section className={styles.bottomCta}>
        <div>
          <h2>Bring your business together.</h2>
          <p>Set up your workspace and add your first product.</p>
        </div>
        <Link className={styles.ctaLight} href="/register">Get started</Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}><Logo href="/" size={40} /><p>One workspace for your shop and daily operations.</p></div>
        <div className={styles.footerColumn}><h2>Explore</h2><Link href="/features">Features</Link><Link href="/how-it-works">How it works</Link><Link href="/pricing">Pricing</Link><Link href="/register">Get started</Link></div>
        <div className={styles.footerColumn}><h2>Help</h2><Link href="/support">Support</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/login">Sign in</Link></div>
        <div className={styles.footerColumn}><h2>Contact</h2><a href="tel:+254701059192">+254 701 059 192</a><a href="tel:+254101024580">+254 101 024 580</a><a href="mailto:support@christech.co.ke">support@christech.co.ke</a></div>
        <div className={styles.footerBottom}><span>© {new Date().getFullYear()} Commerce Workspace.</span><span>Orders are requests; payment is arranged with the merchant.</span></div>
      </footer>
    </main>
  );
}
