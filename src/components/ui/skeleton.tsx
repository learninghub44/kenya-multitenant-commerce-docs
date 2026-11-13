import styles from "./ui.module.css";

/** Decorative loading placeholder; the surrounding region should set aria-busy. */
export function Skeleton({ height }: { height?: number }) {
  return <span className={styles.skeleton} style={height ? { minHeight: height } : undefined} aria-hidden="true" />;
}
