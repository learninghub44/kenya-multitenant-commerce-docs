import type { ReactNode } from "react";
import styles from "./ui.module.css";

export type Tone = "neutral" | "success" | "warning" | "error";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={[styles.badge, tone !== "neutral" ? styles[tone] : ""].filter(Boolean).join(" ")}>{children}</span>;
}
