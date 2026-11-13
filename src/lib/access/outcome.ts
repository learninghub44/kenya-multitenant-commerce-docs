import { canAccess, isTenantRole, type Permission, type TenantRole } from "../permissions.ts";

export type AccessOutcome =
  | { kind: "login" }
  | { kind: "not_found" }
  | { kind: "unavailable"; status: string }
  | { kind: "denied"; role: TenantRole }
  | { kind: "ok"; role: TenantRole };

/**
 * Pure decision function behind requireTenantAccess(). It never trusts the
 * browser: `workspace` comes from the get_workspace_access RPC, which derives
 * the caller from auth.uid() inside Postgres.
 *
 * Fail-closed rules:
 *  - no session                          -> login
 *  - no active membership / no such slug -> not_found (never reveals existence)
 *  - tenant status is anything but active -> unavailable
 *  - unknown role value                  -> not_found
 *  - role lacks the permission           -> denied
 */
export function resolveAccessOutcome(input: {
  authenticated: boolean;
  workspace: { status: string; role: string } | null;
  permission: Permission | null;
}): AccessOutcome {
  if (!input.authenticated) return { kind: "login" };
  const { workspace, permission } = input;
  if (!workspace || !isTenantRole(workspace.role)) return { kind: "not_found" };
  if (workspace.status !== "active") return { kind: "unavailable", status: workspace.status };
  if (!canAccess(workspace.role, permission)) return { kind: "denied", role: workspace.role };
  return { kind: "ok", role: workspace.role };
}
