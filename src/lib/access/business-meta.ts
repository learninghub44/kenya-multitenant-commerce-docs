import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BusinessMeta = { businessCode: string | null; timezone: string };

/**
 * Display-only extras for the workspace chrome. Reads through the caller's own session (RLS applies).
 * Failure is non-fatal on purpose: if the business_code migration has not been applied yet the dashboard
 * still works and simply omits the ID.
 */
export const loadBusinessMeta = cache(async (tenantId: string): Promise<BusinessMeta> => {
  const fallback: BusinessMeta = { businessCode: null, timezone: "Africa/Nairobi" };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("tenants").select("business_code, timezone").eq("id", tenantId).maybeSingle();
    if (error || !data) {
      if (error) console.error("[access] business meta unavailable", { code: error.code });
      const retry = await supabase.from("tenants").select("timezone").eq("id", tenantId).maybeSingle();
      return { ...fallback, timezone: (retry.data as { timezone?: string } | null)?.timezone ?? fallback.timezone };
    }
    const row = data as { business_code?: string | null; timezone?: string | null };
    return { businessCode: row.business_code ?? null, timezone: row.timezone || fallback.timezone };
  } catch {
    return fallback;
  }
});
