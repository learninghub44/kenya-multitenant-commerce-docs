import Logo from "@/components/logo";
import { storeDisplayAddress } from "@/lib/store-url";

type AuthShellProps = {
  headline: string;
  accent: string;
  summary: string;
  points?: string[];
  /** Show the "your shop link" preview on the green panel. */
  shopLink?: boolean;
  children: React.ReactNode;
};

export default function AuthShell({ headline, accent, summary, points, shopLink = false, children }: AuthShellProps) {
  return (
    <main className="auth-shell">
      <aside className="auth-aside">
        <Logo href="/" tone="light" size={42} />
        <div className="auth-aside-body">
          <h2>{headline}<span>{accent}</span></h2>
          <p>{summary}</p>
          {points && (
            <ul className="auth-points">
              {points.map((point) => <li key={point}>{point}</li>)}
            </ul>
          )}
        </div>
        <div className="auth-aside-foot">
          {shopLink && (
            <div className="auth-url-pill" aria-label="Example shop link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2.5" stroke="currentColor" strokeWidth="2" /><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <span>{storeDisplayAddress("yourshop")}</span>
            </div>
          )}
          <small>Built for growing Kenyan businesses.</small>
        </div>
      </aside>
      <div className="auth-main">{children}</div>
    </main>
  );
}
