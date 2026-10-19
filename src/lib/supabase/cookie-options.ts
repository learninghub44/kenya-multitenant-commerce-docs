// When the app runs on a real domain, share the auth cookie across the root domain and
// its store subdomains so one buyer account works on every store. Local development and
// workers.dev keep host-only cookies.
export function sharedCookieOptions(): { domain: string } | undefined {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return undefined;
  try {
    const host = new URL(base).hostname.toLowerCase();
    const isLocal = host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.endsWith(".workers.dev");
    return isLocal ? undefined : { domain: `.${host}` };
  } catch {
    return undefined;
  }
}
