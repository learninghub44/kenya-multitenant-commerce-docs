import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return [];
  const lastModified = new Date();
  return ["/", "/features", "/how-it-works", "/pricing", "/privacy", "/terms"].map((path) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: path === "/" ? 1 : 0.7
  }));
}
