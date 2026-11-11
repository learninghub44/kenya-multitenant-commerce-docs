import type { ReactNode } from "react";

export function DashboardPageHeader({ eyebrow, title, description, aside }: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return <header className="dashboard-header">
    <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="auth-description">{description}</p></div>
    {aside ? <div className="dashboard-header-aside">{aside}</div> : null}
  </header>;
}

export function DashboardEmptyState({ title, description, children }: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return <div className="empty-state dashboard-empty-state">
    <div><h2>{title}</h2><p>{description}</p></div>
    {children ? <div className="dashboard-empty-action">{children}</div> : null}
  </div>;
}

export function DashboardNotice({ children, tone = "info" }: {
  children: ReactNode;
  tone?: "info" | "error";
}) {
  return <p className={tone === "error" ? "dashboard-alert" : "dashboard-notice"} role={tone === "error" ? "alert" : "status"}>{children}</p>;
}
