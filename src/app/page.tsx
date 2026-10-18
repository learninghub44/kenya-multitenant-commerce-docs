import Link from "next/link";
import Logo from "@/components/logo";
import styles from "./home.module.css";

const capabilities = [
  { title: "An online shop that is yours", description: "Publish products with photos, prices and variants, then share one link so customers can browse and order from any phone." },
  { title: "Stock you can trust", description: "Every stock change is recorded, so you always know what is on the shelf and what has moved." },
  { title: "Orders without the chaos", description: "See new order requests, confirm them and mark them fulfilled, with customer details in one place." },
  { title: "The business behind the shop", description: "Keep suppliers, customers, purchases and expenses next to your sales, with simple reports." },
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <Logo href="/" size={44} />
        <nav aria-label="Main navigation">
          <a href="#features">What you get</a>
          <Link className={styles.navSignIn} href="/login">Sign in</Link>
          <Link className={styles.navCta} href="/register">Get started</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>For shops and small businesses in Kenya</p>
          <h1>Sell online and run the business behind it.</h1>
          <p className={styles.heroDescription}>Your online shop, stock, orders and business records in one workspace. Set up your catalogue today and grow at your own pace.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href="/register">Create your workspace</Link>
            <Link className={styles.textCta} href="#features">See what you get</Link>
          </div>
        </div>
        <div className={styles.preview} role="img" aria-label="Preview of the business workspace showing products, orders and stock">
          <div className={styles.previewTop}><span /><span /><span /><b>Your business at a glance</b></div>
          <div className={styles.previewBody}>
            <div className={styles.previewTiles}>
              <div><small>Products</small><strong>Catalogue</strong><span>Photos, prices, variants</span></div>
              <div><small>Orders</small><strong>One inbox</strong><span>From request to fulfilled</span></div>
            </div>
            <ul className={styles.previewList}>
              <li><i className={styles.swatchSand} /><span><b>Product catalogue</b><small>Images, prices and variants</small></span></li>
              <li><i className={styles.swatchSage} /><span><b>Stock and orders</b><small>Inventory and fulfilment</small></span></li>
              <li><i className={styles.swatchSun} /><span><b>Business records</b><small>Suppliers, customers, expenses</small></span></li>
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.features} id="features">
        <div className={styles.sectionIntro}>
          <h2>Everything you need to sell and keep track</h2>
          <p>Practical tools for the work you do every day, without a complicated system to learn.</p>
        </div>
        <div className={styles.featureGrid}>
          {capabilities.map((item) => (
            <article className={styles.featureCard} key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.bottomCta}>
        <div>
          <h2>Bring your business into one workspace.</h2>
          <p>Create an account, name your business and add your first product.</p>
        </div>
        <Link className={styles.ctaLight} href="/register">Get started</Link>
      </section>

      <footer className={styles.footer}>
        <Logo href="/" size={40} />
        <Link href="/login">Sign in</Link>
      </footer>
    </main>
  );
}
