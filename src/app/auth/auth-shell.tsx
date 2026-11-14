import Link from "next/link";
import Logo from "@/components/logo";
import { storeDisplayAddress } from "@/lib/store-url";

type AuthShellProps = {
  headline: string;
  accent: string;
  summary: string;
  points?: string[];
  shopLink?: boolean;
  compact?: boolean;
  activeAuth?: "login" | "register";
  children: React.ReactNode;
};

function AuthBrand() {
  return (
    <Link className="auth-brand" href="/" aria-label="Commerce Workspace homepage">
      <span className="auth-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 52 52" role="presentation">
          <defs><linearGradient id="authBrandGradient" x1="4" y1="4" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stopColor="#e9a23b"/><stop offset="1" stopColor="#c2650a"/></linearGradient></defs>
          <rect x="1" y="1" width="50" height="50" rx="16" fill="#17191f"/>
          <path d="M24 13H17.5a8.5 8.5 0 1 0 0 17H24" fill="none" stroke="url(#authBrandGradient)" strokeWidth="4.5" strokeLinecap="round"/>
          <path d="M28 22h7.5a8.5 8.5 0 1 1 0 17H28" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round"/>
          <path d="M19 34h14" stroke="#e9a23b" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </span>
      <span className="auth-brand-copy"><strong>Commerce <em>Workspace</em></strong><small>YOUR BUSINESS. IN ONE PLACE.</small></span>
    </Link>
  );
}

export default function AuthShell({ headline, accent, summary, points, shopLink = false, compact = false, activeAuth, children }: AuthShellProps) {
  if (compact) {
    return (
      <main className="auth-shell auth-shell-figma">
        <header className="auth-topbar">
          <AuthBrand />
          <nav className="auth-topnav" aria-label="Account navigation">
            <Link className={activeAuth === "login" ? "is-active" : ""} aria-current={activeAuth === "login" ? "page" : undefined} href="/login">Sign in</Link>
            <Link className={activeAuth === "register" ? "is-active auth-topnav-cta" : "auth-topnav-cta"} aria-current={activeAuth === "register" ? "page" : undefined} href="/register">Sign up</Link>
          </nav>
        </header>
        <div className="auth-main auth-main-figma">
          <Link className="auth-home-link" href="/"><span aria-hidden="true">←</span> Back to homepage</Link>
          {children}
        </div>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <aside className="auth-aside">
        <Logo href="/" tone="light" size={42} />
        <div className="auth-aside-body">
          <h2>{headline}<span>{accent}</span></h2>
          <p>{summary}</p>
          {points && <ul className="auth-points">{points.map(point => <li key={point}>{point}</li>)}</ul>}
        </div>
        <div className="auth-aside-foot">
          {shopLink && <div className="auth-url-pill" aria-label="Example shop link"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2.5" stroke="currentColor" strokeWidth="2" /><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg><span>{storeDisplayAddress("yourshop")}</span></div>}
          <small>Made for growing businesses.</small>
        </div>
      </aside>
      <div className="auth-main">{children}</div>
    </main>
  );
}
