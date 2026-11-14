import Link from "next/link";
import Logo from "@/components/logo";
import styles from "./home.module.css";
import { Reveal } from "@/components/reveal";

const features = [
  { number: "01", title: "Product catalogue", description: "Add products, photos, prices and variants. Keep your catalogue ready to share." },
  { number: "02", title: "Stock control", description: "Track quantities and stock movements so you know what is available." },
  { number: "03", title: "Orders", description: "Review customer requests and keep fulfilment organised." },
  { number: "04", title: "Business records", description: "Keep customer, supplier, purchase and expense records together." },
];

const steps = [
  ["Create a workspace", "Set up your business space in a few simple steps."],
  ["Add your products", "Build your catalogue and organise your stock."],
  ["Share your shop", "Give customers a simple link to browse your products."],
  ["Manage each day", "Review requests and keep business records up to date."],
];

function Navigation() {
  return <header className={styles.nav}>
    <Logo href="/" size={44} />
    <nav className={styles.desktopNav} aria-label="Main navigation">
      <Link href="/features">Features</Link><Link href="/how-it-works">How it works</Link><Link href="/pricing">Pricing</Link><Link href="/support">Support</Link>
      <Link className={styles.signIn} href="/login">Sign in</Link><Link className={styles.navCta} href="/register">Get started</Link>
    </nav>
    <details className={styles.mobileMenu}>
      <summary aria-label="Open navigation menu"><span></span><span></span><span></span><b>Menu</b></summary>
      <nav aria-label="Mobile navigation">
        <Link href="/features">Features</Link><Link href="/how-it-works">How it works</Link><Link href="/pricing">Pricing</Link><Link href="/support">Support</Link><Link href="/login">Sign in</Link><Link className={styles.mobileCta} href="/register">Get started</Link>
      </nav>
    </details>
  </header>;
}

export default function HomePage() {
  return <main className={styles.page}>
    <Navigation />
    <section className={styles.hero}>
      <Reveal className={styles.heroCopy}>
        <p className={styles.eyebrow}><span /> BUSINESS, MADE CLEARER</p>
        <h1>Everything your shop needs.<br /><em>All in one place.</em></h1>
        <p className={styles.lead}>A simple workspace to manage products, stock, customer orders and the records behind your business.</p>
        <div className={styles.actions}><Link className={styles.primary} href="/register">Create your workspace <span>→</span></Link><Link className={styles.secondary} href="/how-it-works">See how it works</Link></div>
        <p className={styles.supporting}>Practical tools for the everyday running of your business.</p>
      </Reveal>
      <Reveal className={styles.visual} aria-label="Illustration of a business management workspace">
        <div className={styles.visualTop}><span className={styles.dot}></span><span className={styles.dot}></span><span className={styles.dot}></span><b>BUSINESS OVERVIEW</b><small>Workspace</small></div>
        <div className={styles.visualBody}>
          <div className={styles.visualWelcome}><span>YOUR BUSINESS</span><strong>A little more organised.</strong><small>Your daily work, together.</small></div>
          <div className={styles.metricGrid}><div><span>01 / CATALOGUE</span><b>Products</b><small>Prices, photos and details</small></div><div><span>02 / INVENTORY</span><b>Stock</b><small>Quantities and movements</small></div></div>
          <div className={styles.activity}><div className={styles.activityTitle}>Your daily tools <span>IN ONE PLACE</span></div><div><i className={styles.greenIcon}>P</i><span><b>Product catalogue</b><small>Keep your products organised</small></span><strong>↗</strong></div><div><i className={styles.goldIcon}>O</i><span><b>Customer orders</b><small>Review requests and fulfilment</small></span><strong>↗</strong></div><div><i className={styles.sageIcon}>R</i><span><b>Business records</b><small>Customers, suppliers and expenses</small></span><strong>↗</strong></div></div>
        </div>
      </Reveal>
    </section>
    <section className={styles.features} id="features">
      <Reveal className={styles.sectionIntro}><div><p className={styles.sectionLabel}>WHAT YOU CAN DO</p><h2>Run the details.<br /><em>See the bigger picture.</em></h2></div><p>Bring the essential parts of your shop into one organised workspace. Start with what matters and grow from there.</p></Reveal>
      <div className={styles.featureGrid}>{features.map((feature,index)=><Reveal className={styles.featureReveal} delay={index * 0.07} key={feature.number}><article className={styles.feature}><span>{feature.number}</span><h3>{feature.title}</h3><p>{feature.description}</p></article></Reveal>)}</div>
      <div className={styles.moreLink}><Link href="/features">Explore all features <span>→</span></Link></div>
    </section>
    <section className={styles.how}>
      <Reveal className={styles.howIntro}><p className={styles.sectionLabel}>GETTING STARTED</p><h2>Simple to set up.<br /><em>Easy to keep moving.</em></h2><p>Get your workspace ready, then use it to bring your daily operations together.</p><Link href="/how-it-works">See how it works <span>→</span></Link></Reveal>
      <Reveal className={styles.steps}>{steps.map(([title,description],index)=><article key={title}><span>0{index+1}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</Reveal>
    </section>
    <section className={styles.cta}><Reveal><div><p className={styles.sectionLabel}>A BETTER WAY TO STAY ORGANISED</p><h2>Bring your business<br />into one workspace.</h2><p>Start with your catalogue. Build from there.</p></div><Link href="/register">Create your workspace <span>→</span></Link></Reveal></section>
    <footer className={styles.footer}>
      <div className={styles.footerBrand}><Logo href="/" size={42}/><p>One clear workspace for your shop, stock and daily business operations.</p></div>
      <div className={styles.footerColumn}><h2>Explore</h2><Link href="/features">Features</Link><Link href="/how-it-works">How it works</Link><Link href="/pricing">Pricing</Link><Link href="/register">Get started</Link></div>
      <div className={styles.footerColumn}><h2>Help &amp; legal</h2><Link href="/support">Help centre</Link><Link href="/privacy">Privacy notice</Link><Link href="/terms">Terms of use</Link><Link href="/login">Sign in</Link></div>
      <div className={styles.footerColumn}><h2>Contact support</h2><a href="tel:+254701059192">+254 701 059 192</a><a href="tel:+254101024580">+254 101 024 580</a><a href="mailto:support@christech.co.ke">support@christech.co.ke</a></div>
      <div className={styles.footerBottom}><span>© {new Date().getFullYear()} Commerce Workspace. All rights reserved.</span><span>Orders are requests. Customers arrange payment directly with the merchant.</span></div>
    </footer>
  </main>;
}
