"use client";

import { createBrowserClient } from "@supabase/ssr";
import { sharedCookieOptions } from "./cookie-options";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  browserClient ??= createBrowserClient(url, anonKey, { cookieOptions: sharedCookieOptions() });
  return browserClient;
}