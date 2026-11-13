import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { ReactElement } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import AccessDenied from "@/components/access/access-denied";
import WorkspaceUnavailable from "@/components/access/workspace-unavailable";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { permissionsForRole, type Permission, type TenantRole } from "@/lib/permissions";
import { getTenantAccess } from "./tenant-access";

/** Cached sign-in check for server components. Redirects to /login when signed out. */
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : user;
});

export async function requireUser(nextPath = "/dashboard"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export type GrantedTenantAccess = {
  denied: null;
  supabase: SupabaseClient;
  user: User;
  tenant: { id: string; name: string; slug: string; currency: string };
  role: TenantRole;
  permissions: Permission[];
};
export type DeniedTenantAccess = { denied: ReactElement };

/**
 * Server-side gate for dashboard pages and layouts.
 *
 *   const access = await requireTenantAccess(tenantSlug, {
 *     permission: "products.update", area: "the product catalogue", path: "/products",
 *   });
 *   if (access.denied) return access.denied;
 *
 * - signed out                 -> redirect to /login?next=…
 * - unknown slug / non-member  -> notFound()
 * - suspended or closed tenant -> "workspace unavailable" page (not a 404)
 * - role lacks permission      -> shared access-denied page
 * - lookup failure             -> throws a generic error (details logged server-side)
 */
export async function requireTenantAccess(
  tenantSlug: string,
  options: { permission?: Permission | null; area?: string; path?: string } = {},
): Promise<GrantedTenantAccess | DeniedTenantAccess> {
  const { permission = null, area = "this area", path = "" } = options;
  const access = await getTenantAccess(tenantSlug, permission);

  if (access.failed) throw new Error("Could not verify your business access.");

  switch (access.outcome.kind) {
    case "login":
      redirect(`/login?next=${encodeURIComponent(`/dashboard/${tenantSlug}${path}`)}`);
    case "not_found":
      notFound();
    case "unavailable":
      return {
        denied: <WorkspaceUnavailable name={access.workspace?.name ?? "This workspace"} status={access.outcome.status} />,
      };
    case "denied":
      return { denied: <AccessDenied tenantSlug={tenantSlug} role={access.outcome.role} area={area} /> };
    case "ok": {
      const { user, workspace, supabase } = access;
      if (!user || !workspace) notFound();
      return {
        denied: null,
        supabase,
        user,
        tenant: { id: workspace.tenant_id, name: workspace.name, slug: workspace.slug, currency: workspace.currency },
        role: access.outcome.role,
        permissions: permissionsForRole(access.outcome.role),
      };
    }
  }
}
