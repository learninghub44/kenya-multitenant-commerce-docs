import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { RESERVED_SLUGS } from "./lib/reserved-slugs";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Keep local preview/builds usable before environment setup; protected pages
  // still fail closed because they require a valid Supabase user.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      }
    }
  });

  // Do not trust a client-side session alone. getUser validates the session
  // against Supabase Auth and refreshes cookies when needed.
  await supabase.auth.getUser();

  // Wildcard subdomains map to the explicit storefront route. APP_URL must use
  // the apex/root application domain (for example https://example.co.ke).
  // Reserved platform hosts are never treated as merchant slugs.
  const reservedHosts = RESERVED_SLUGS;
  const configuredAppUrl = process.env.APP_URL;
  if (configuredAppUrl) {
    try {
      const rootHost = new URL(configuredAppUrl).hostname.toLowerCase();
      // Prefer the real Host header: nextUrl.hostname can report the server's own
      // address instead of the public hostname depending on the runtime.
      const requestHost = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.hostname)
        .split(",")[0].trim().split(":")[0].toLowerCase();
      if (requestHost.endsWith("." + rootHost)) {
        const subdomain = requestHost.slice(0, -(rootHost.length + 1));
        const isSingleLabel = !subdomain.includes(".");
        const validSlug = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/.test(subdomain);
        const alreadyStoreRoute = request.nextUrl.pathname.startsWith("/store/");
        if (isSingleLabel && validSlug && !reservedHosts.has(subdomain) && !alreadyStoreRoute &&
            !request.nextUrl.pathname.startsWith("/_next/") &&
            !request.nextUrl.pathname.startsWith("/api/")) {
          const rewritten = request.nextUrl.clone();
          rewritten.pathname = "/store/" + subdomain;
          const rewriteResponse = NextResponse.rewrite(rewritten, { request: { headers: request.headers } });
          // Wildcard hosts arrive at "/" before the internal rewrite, so apply
          // the private cache policy here as well as in next.config.ts.
          rewriteResponse.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
          return rewriteResponse;
        }
      }
    } catch {
      // Invalid APP_URL disables wildcard routing instead of guessing a host.
    }
  }
  if (/^\/(dashboard|auth|onboarding|store|api)(\/|$)/.test(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
