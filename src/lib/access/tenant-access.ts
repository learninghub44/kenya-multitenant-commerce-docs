import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Permission } from "@/lib/permissions";
import { resolveAccessOutcome, type AccessOutcome } from "./outcome";

export type WorkspaceRow = {
  tenant_id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  role: string;
};

/**
 * One cached lookup per request: current user + the caller's own membership in
 * the workspace named by the URL slug. Tenant id, status and role are always
 * read from Postgres (get_workspace_access derives auth.uid() itself).
 * React.cache de-duplicates it across layout, page and server components.
 */
export const loadWorkspace = cache(async (tenantSlug: string) => {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { supabase, user: null, workspace: null, failed: false as const };
  }

  const { data, error } = await supabase.rpc("get_workspace_access", { p_slug: tenantSlug });
  if (error) {
    // Details stay in server logs; users only ever see a safe message.
    console.error("[access] get_workspace_access failed", { code: error.code, message: error.message });
    return { supabase, user, workspace: null, failed: true as const };
  }
  const workspace = ((data ?? []) as WorkspaceRow[])[0] ?? null;
  return { supabase, user, workspace, failed: false as const };
});

/** Lower-level result for route handlers, which map outcomes to HTTP codes. */
export async function getTenantAccess(tenantSlug: string, permission: Permission | null = null) {
  const loaded = await loadWorkspace(tenantSlug);
  const outcome: AccessOutcome = resolveAccessOutcome({
    authenticated: Boolean(loaded.user),
    workspace: loaded.workspace,
    permission,
  });
  return { ...loaded, outcome };
}
