import Link from "next/link";

export function LogoMark({ size = 40, inverted = false }: { size?: number; inverted?: boolean }) {
  const tile = inverted ? "#ffffff" : "#0f8a43";
  const bag = inverted ? "#0f8a43" : "#ffffff";
  const tick = inverted ? "#ffffff" : "#0f8a43";
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect width="48" height="48" rx="12" fill={tile} />
      <path d="M13 19h22l-1.6 18a3 3 0 0 1-3 2.7H17.6a3 3 0 0 1-3-2.7L13 19z" fill={bag} />
      <path d="M18.5 19v-3.5a5.5 5.5 0 0 1 11 0V19" fill="none" stroke="#ffc42e" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M19.5 29.5l3.2 3.2 6-6.4" fill="none" stroke={tick} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type LogoProps = {
  href?: string;
  /** "light" is for dark or green backgrounds, "dark" for white backgrounds. */
  tone?: "dark" | "light";
  size?: number;
  markOnly?: boolean;
  className?: string;
};

export default function Logo({ href, tone = "dark", size = 40, markOnly = false, className = "" }: LogoProps) {
  const content = (
    <>
      <LogoMark size={size} inverted={tone === "light"} />
      {!markOnly && (
        <span className="logo-word" style={{ fontSize: Math.round(size * 0.48) }}>
          Commerce <span>Workspace</span>
        </span>
      )}
    </>
  );
  const classes = `logo logo-${tone} ${className}`.trim();
  if (!href) return <span className={classes}>{content}</span>;
  return (
    <Link className={classes} href={href} aria-label="Commerce Workspace home">
      {content}
    </Link>
  );
}
