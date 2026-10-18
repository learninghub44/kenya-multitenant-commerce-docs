import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeNextPath } from "@/lib/auth-helpers";

export const runtime = "nodejs";

// Completes Google sign-in, email confirmation, magic links and password-reset links.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = getSafeNextPath(searchParams.get("next"), origin);
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, origin));

  if (searchParams.get("error")) return fail("cancelled");

  try {
    const supabase = await createSupabaseServerClient();
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return fail("link_expired");
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (error) return fail("link_expired");
    } else {
      return fail("link_invalid");
    }
  } catch {
    return fail("unavailable");
  }

  return NextResponse.redirect(new URL(next, origin));
}
