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

// Sign-in and sign-up always happen on the root app domain. `returnTo` brings the buyer
// back to the exact store page they came from.
export function authUrl(page: "login" | "register", returnTo: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  let origin = "";
  if (base) {
    try {
      origin = new URL(base).origin;
    } catch {
      origin = "";
    }
  }
  return `${origin}/${page}?next=${encodeURIComponent(returnTo)}`;
}

export function accountUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  try {
    return `${base ? new URL(base).origin : ""}/account`;
  } catch {
    return "/account";
  }
}
