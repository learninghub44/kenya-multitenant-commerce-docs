import type { ReactNode } from "react";

type AuthShellProps = {
  headline: string;
  accent: string;
  summary: string;
  points?: string[];
  shopLink?: boolean;
  children: ReactNode;
};

export default function AuthShell({ children }: AuthShellProps) {
  return <main className="auth-shell auth-shell-figma"><div className="auth-main auth-main-figma">{children}</div></main>;
}
