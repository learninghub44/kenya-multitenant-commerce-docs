import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Resolve the signed-in user's access to a tenant from the URL slug.
 * The tenant ID and role are always read from Supabase, never accepted from
 * browser input. React.cache deduplicates this lookup during one server render.
 */
export const getTenantAccess = cache(async (tenantSlug: string) => {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, tenant: null, membership: null, reason: "unauthenticated" as const };
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name, slug, status, currency")
    .eq("slug", tenantSlug)
    .maybeSingle();

  if (tenantError) {
    return { supabase, user, tenant: null, membership: null, reason: "tenant_error" as const };
  }
  if (!tenant || tenant.status !== "active") {
    return { supabase, user, tenant: null, membership: null, reason: "not_found" as const };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (membershipError) {
    return { supabase, user, tenant, membership: null, reason: "membership_error" as const };
  }
  if (!membership) {
    return { supabase, user, tenant, membership: null, reason: "not_found" as const };
  }

  return { supabase, user, tenant, membership, reason: null };
});
