// Public storefront URL: https://<slug>.<root-domain> when NEXT_PUBLIC_APP_URL is a real
// domain, otherwise the path-based /store/<slug> route (local development, workers.dev).
export function storeUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (base) {
    try {
      const url = new URL(base);
      const host = url.hostname.toLowerCase();
      const isLocal = host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.endsWith(".workers.dev");
      if (!isLocal) return `${url.protocol}//${slug}.${url.host}`;
      return `${url.origin}/store/${slug}`;
    } catch {
      // fall through to the relative route
    }
  }
  return `/store/${slug}`;
}

export function storeDisplayAddress(slug: string): string {
  const url = storeUrl(slug);
  return url.startsWith("/") ? `/store${url.slice("/store".length)}` : url.replace(/^https?:\/\//, "");
}
