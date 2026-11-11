import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Platform administration",
  description: "Restricted platform operations console.",
  robots: { index: false, follow: false }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#17251d" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
