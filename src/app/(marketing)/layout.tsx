import type { ReactNode } from "react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";
import styles from "../marketing.module.css";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.nav}><MarketingHeader /></div>
      <main>{children}</main>
      <div className={styles.container}><MarketingFooter /></div>
    </div>
  );
}
