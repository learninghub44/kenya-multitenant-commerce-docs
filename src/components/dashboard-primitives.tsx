import type { ReactNode } from "react";
import styles from "./dashboard-primitives.module.css";

export function DashboardPageHeader({ eyebrow, title, description, aside }: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return <header className="dashboard-header">
    <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="auth-description">{description}</p></div>
    {aside ? <div className={styles.headerAside}>{aside}</div> : null}
  </header>;
}

export function DashboardEmptyState({ title, description, children }: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return <div className={`empty-state ${styles.emptyState}`}>
    <div><h2>{title}</h2><p>{description}</p></div>
    {children ? <div className={styles.emptyAction}>{children}</div> : null}
  </div>;
}

export function DashboardNotice({ children, tone = "info" }: {
  children: ReactNode;
  tone?: "info" | "error";
}) {
  return <p className={tone === "error" ? "dashboard-alert" : styles.notice} role={tone === "error" ? "alert" : "status"}>{children}</p>;
}
