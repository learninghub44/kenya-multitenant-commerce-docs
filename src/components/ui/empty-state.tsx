import type { ReactNode } from "react";
import styles from "./ui.module.css";

export function EmptyState({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className={`empty-state ${styles.emptyState}`}>
    <div><h2>{title}</h2><p>{description}</p></div>
    {children ? <div className={styles.emptyAction}>{children}</div> : null}
  </div>;
}
