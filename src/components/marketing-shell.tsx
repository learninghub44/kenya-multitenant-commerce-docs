import Link from "next/link";
import Logo from "@/components/logo";

const supportEmail = "support@christech.co.ke";

export function MarketingHeader() {
  return <header className="marketing-nav"><Logo href="/" size={44} /><nav aria-label="Main navigation">
    <Link href="/features">Features</Link><Link href="/how-it-works">How it works</Link><Link href="/pricing">Pricing</Link><Link href="/support">Support</Link><Link href="/login">Sign in</Link><Link className="marketing-nav-cta" href="/register">Get started</Link>
  </nav></header>;
}

export function MarketingFooter() {
  return <footer className="marketing-footer">
    <div className="marketing-footer-brand"><Logo href="/" size={40}/><p>Practical tools for independent businesses. Manage your catalogue, stock, customer requests and business records in one workspace.</p></div>
    <div className="marketing-footer-column"><h2>Explore</h2><Link href="/features">Features</Link><Link href="/how-it-works">How it works</Link><Link href="/pricing">Plans and access</Link><Link href="/register">Create workspace</Link></div>
    <div className="marketing-footer-column"><h2>Help and information</h2><Link href="/support">Help centre</Link><Link href="/privacy">Privacy notice</Link><Link href="/terms">Terms of use</Link><Link href="/login">Sign in</Link></div>
    <div className="marketing-footer-column marketing-footer-contact"><h2>Contact support</h2><a href="tel:+254701059192">+254 701 059 192</a><a href="tel:+254101024580">+254 101 024 580</a><a href={`mailto:${supportEmail}`}>{supportEmail}</a></div>
    <div className="marketing-footer-bottom"><span>© {new Date().getFullYear()} Commerce Workspace. All rights reserved.</span><span>Orders are requests; payment is arranged directly with the merchant.</span></div>
  </footer>;
}
