import type { ReactNode } from "react";

/**
 * Outline icons for the workspace navigation. One glyph per NAV_ITEMS path so
 * the mobile menu sheet and the bottom bar always agree. All icons are drawn on
 * a 24x24 grid with currentColor so callers control the colour.
 */
const GLYPHS: Record<string, ReactNode> = {
  // Overview
  "": <><path d="m3 10.5 9-7 9 7" /><path d="M5 9.5V20h14V9.5" /><path d="M9.5 20v-6h5v6" /></>,
  "/orders": <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5" /><path d="M9 12.5h7M9 16.5h7" /></>,
  "/products": <><path d="m12 2.5 8.5 4.8v9.4L12 21.5l-8.5-4.8V7.3z" /><path d="m3.5 7.3 8.5 4.8 8.5-4.8M12 12.1v9.4" /></>,
  "/categories": <><rect x="3.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.8" /></>,
  "/inventory": <><rect x="3.5" y="4" width="17" height="4.5" rx="1.2" /><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5" /><path d="M10 12.5h4" /></>,
  "/erp": <><path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /><path d="M9.5 8h5" /></>,
  "/reports": <><path d="M4 4v16h16" /><path d="M8.5 16v-5M13 16V8M17.5 16v-3" /></>,
  "/settings": <><circle cx="12" cy="12" r="3" /><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h0a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5h0a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v0a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></>,
  "/payments": <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a1 1 0 0 1 1 1v2" /><path d="M4 7.5V17a2 2 0 0 0 2 2h12a1 1 0 0 0 1-1v-3" /><path d="M4 7.5A2.5 2.5 0 0 0 6.5 10H19a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3.5a2 2 0 1 1 0-4" /></>,
  "/team": <><circle cx="9" cy="8.5" r="3.2" /><path d="M3 20c.4-3.3 2.8-5.5 6-5.5s5.6 2.2 6 5.5" /><path d="M16 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.7c2 .6 3.3 2.3 3.5 5.3" /></>,
  "/activity": <path d="M3 12h4l2.5-7 4 14L16 12h5" />,
  "/support": <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="m5.6 5.6 3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9" /></>,
};

const EXTRA: Record<string, ReactNode> = {
  menu: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.8" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  storefront: <><path d="M4 9.5 5.5 4h13L20 9.5" /><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" /><path d="M5.5 12.5V20h13v-7.5" /><path d="M10 20v-4.5h4V20" /></>,
  switch: <><rect x="4" y="3.5" width="10" height="17" rx="1.6" /><path d="M7.5 7.5h3M7.5 11h3M7.5 14.5h3" /><path d="M14 9.5h4.5a1.5 1.5 0 0 1 1.5 1.5v9.5" /></>,
  logout: <><path d="M9 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h3" /><path d="m15 8 4 4-4 4M19 12H9" /></>,
};

type NavIconProps = {
  /** A NAV_ITEMS path ("" for Overview) or one of the extra icon names. */
  name: string;
  size?: number;
  className?: string;
};

export default function NavIcon({ name, size = 22, className }: NavIconProps) {
  const glyph = name in EXTRA ? EXTRA[name] : GLYPHS[name] ?? GLYPHS["/support"];
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  );
}
