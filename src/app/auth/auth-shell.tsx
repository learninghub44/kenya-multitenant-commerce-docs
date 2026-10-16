import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  headline: string;
  summary: string;
  points?: string[];
  children: ReactNode;
};

export default function AuthShell({ headline, summary, points, children }: AuthShellProps) {
  return (
    <main className="auth-shell">
      <aside className="auth-aside">
        <Link className="auth-brand" href="/" aria-label="Commerce Workspace home">
          <span className="auth-brand-mark" aria-hidden="true">C</span>
          Commerce Workspace
        </Link>
        <div>
          <h2>{headline}</h2>
          <p>{summary}</p>
          {points && (
            <ul className="auth-points">
              {points.map((point) => <li key={point}>{point}</li>)}
            </ul>
          )}
        </div>
        <small>Built for growing Kenyan businesses.</small>
      </aside>
      <div className="auth-main">{children}</div>
    </main>
  );
}
