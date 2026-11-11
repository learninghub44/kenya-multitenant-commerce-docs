import Link from "next/link";
import Logo from "@/components/logo";

export function MarketingHeader() {
  return (
    <header className="marketing-nav">
      <Logo href="/" size={42} />
      <nav aria-label="Main navigation">
        <Link href="/features">Features</Link>
        <Link href="/how-it-works">How it works</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/login">Sign in</Link>
        <Link className="marketing-nav-cta" href="/register">Get started</Link>
      </nav>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <Logo href="/" size={38} />
      <nav aria-label="Legal and product links">
        <Link href="/features">Features</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/login">Sign in</Link>
      </nav>
      <p>Tools for independent businesses. Orders are requests; payment is arranged directly with the merchant.</p>
    </footer>
  );
}
