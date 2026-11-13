import type { HTMLAttributes } from "react";
import styles from "./ui.module.css";

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={[styles.card, className ?? ""].filter(Boolean).join(" ")} {...props} />;
}
