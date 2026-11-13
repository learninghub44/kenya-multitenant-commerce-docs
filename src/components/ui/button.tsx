import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

type Variant = "default" | "primary" | "danger" | "ghost";

function classes(variant: Variant, small?: boolean, extra?: string) {
  return [styles.button, variant !== "default" ? styles[variant] : "", small ? styles.small : "", extra ?? ""].filter(Boolean).join(" ");
}

export function Button({ variant = "default", small, className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean }) {
  return <button type={type} className={classes(variant, small, className)} {...props} />;
}

/** Same look as Button but renders a navigation link. */
export function ButtonLink({ href, variant = "default", small, className, children }: { href: string; variant?: Variant; small?: boolean; className?: string; children: ReactNode }) {
  return <Link href={href} className={classes(variant, small, className)}>{children}</Link>;
}
