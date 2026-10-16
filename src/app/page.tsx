import Link from "next/link";
import styles from "./home.module.css";

const capabilities = [
  { number: "01", title: "A shop that feels like yours", description: "Publish products, share your storefront link, and let customers browse from any phone.", tag: "ONLINE STORE" },
  { number: "02", title: "Stock you can trust", description: "Track product variants and inventory movements in one place, with clearer stock visibility.", tag: "INVENTORY" },
  { number: "03", title: "Orders without the chaos", description: "Keep order requests, fulfilment and customer details organised as your business grows.", tag: "ORDERS" },
  { number: "04", title: "The business behind the shop", description: "Bring purchasing, expenses and practical sales reports into the same workspace.", tag: "BUSINESS TOOLS" },
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <Link className={styles.brand} href="/" aria-label="Commerce Workspace home"><span className={styles.brandMark}>C</span><span>Commerce<span className={styles.brandLight}> Workspace</span></span></Link>
        <nav aria-label="Main navigation"><a href="#features">What you get</a><Link href="/auth?mode=signin">Sign in</Link><Link className={styles.navCta} href="/auth">Get started <span aria-hidden="true">↗</span></Link></nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span /> BUILT FOR EVERYDAY BUSINESS</p>
          <h1>Sell online.<br /><em>Run things</em> better.</h1>
          <p className={styles.heroDescription}>Your online shop and day-to-day business tools, finally working together. Made with growing Kenyan businesses in mind.</p>
          <div className={styles.heroActions}><Link className={styles.primaryCta} href="/auth">Create your workspace <span aria-hidden="true">→</span></Link><Link className={styles.textCta} href="#features">Explore the tools <span aria-hidden="true">↓</span></Link></div>
          <p className={styles.heroNote}>Start with your catalogue. Grow at your own pace.</p>
        </div>
        <div className={styles.preview} aria-label="Illustration of an online shop and inventory workspace">
          <div className={styles.previewTop}><span className={styles.previewDot} /><span className={styles.previewDot} /><span className={styles.previewDot} /><span className={styles.previewTitle}>YOUR BUSINESS, AT A GLANCE</span><span className={styles.previewMenu}>•••</span></div>
          <div className={styles.previewBody}>
            <div className={styles.previewSidebar}><span className={styles.sideActive}>▦</span><span>▤</span><span>□</span><span>◷</span></div>
            <div className={styles.previewMain}><div className={styles.previewHeading}><div><small>OVERVIEW</small><strong>Good morning.</strong></div><span className={styles.livePill}><i /> WORKSPACE</span></div>
              <div className={styles.previewMetrics}><div><small>Products</small><strong>Catalogue</strong><span>Organised</span></div><div><small>Orders</small><strong>In one place</strong><span>Ready to manage</span></div></div>
              <div className={styles.previewSectionTitle}>Your store essentials <span>↗</span></div>
              <div className={styles.previewRow}><span className={styles.productSwatch} /><span><b>Product catalogue</b><small>Images, prices & variants</small></span><span className={styles.rowArrow}>↗</span></div>
              <div className={styles.previewRow}><span className={styles.orderSwatch} /><span><b>Stock & orders</b><small>Inventory and fulfilment</small></span><span className={styles.rowArrow}>↗</span></div>
            </div>
          </div>
          <div className={styles.previewCaption}><span className={styles.captionIcon}>✓</span><span><b>One connected workspace</b><small>Your storefront and operations, together.</small></span></div>
        </div>
        <div className={styles.heroDecoration} aria-hidden="true">✳</div>
      </section>

      <div className={styles.trustLine}><span>ONE PLACE FOR</span><b>YOUR PRODUCTS</b><i /><b>YOUR STOCK</b><i /><b>YOUR ORDERS</b><i /><b>YOUR BUSINESS</b></div>

      <section className={styles.features} id="features">
        <div className={styles.sectionIntro}><p className={styles.eyebrow}>LESS ADMIN. MORE MOMENTUM.</p><h2>Everything starts with<br /><em>a better way to sell.</em></h2><p>Practical tools for the work you do every day—without turning your business into another complicated system.</p></div>
        <div className={styles.featureGrid}>{capabilities.map((item) => <article className={styles.featureCard} key={item.number}><div className={styles.featureTop}><span>{item.number}</span><span className={styles.featureArrow} aria-hidden="true">↗</span></div><p className={styles.featureTag}>{item.tag}</p><h3>{item.title}</h3><p className={styles.featureDescription}>{item.description}</p></article>)}</div>
      </section>

      <section className={styles.bottomCta}><div><p className={styles.eyebrow}>YOUR NEXT STEP</p><h2>Bring your business<br />into one workspace.</h2><p>Create an account and set up your business catalogue.</p></div><Link className={styles.primaryCta} href="/auth">Get started <span aria-hidden="true">→</span></Link></section>
      <footer className={styles.footer}><Link className={styles.brand} href="/"><span className={styles.brandMark}>C</span><span>Commerce<span className={styles.brandLight}> Workspace</span></span></Link><span>Built for growing businesses. Designed for everyday work.</span><Link href="/auth">Sign in / Create account</Link></footer>
    </main>
  );
}
