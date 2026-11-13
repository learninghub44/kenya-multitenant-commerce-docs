import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./ui.module.css";

export type Crumb = { label: string; href?: string };

export function PageHeader({ eyebrow, title, description, aside, breadcrumbs }: {
  eyebrow?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  breadcrumbs?: Crumb[];
}) {
  return <header className="dashboard-header">
    <div>
      {breadcrumbs?.length ? <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><ol>
        {breadcrumbs.map((crumb, index) => <li key={`${crumb.label}-${index}`} aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}>
          {crumb.href && index < breadcrumbs.length - 1 ? <Link href={crumb.href}>{crumb.label}</Link> : crumb.label}
        </li>)}
      </ol></nav> : null}
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {description ? <p className="auth-description">{description}</p> : null}
    </div>
    {aside ? <div className={styles.headerAside}>{aside}</div> : null}
  </header>;
}
