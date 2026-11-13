import type { ReactNode } from "react";
import styles from "./ui.module.css";

/** Errors use role="alert"; everything else is a polite status message. */
export function Alert({ tone = "info", children }: { tone?: "info" | "success" | "warning" | "error"; children: ReactNode }) {
  const toneClass = tone === "info" ? "" : styles[tone];
  return <p className={[styles.alert, toneClass].filter(Boolean).join(" ")} role={tone === "error" ? "alert" : "status"}>{children}</p>;
}
