/**
 * Single source of truth for role -> permission knowledge in the APPLICATION.
 *
 * Authority note: this map is for presentation and early server-side gating.
 * Postgres RLS and the SECURITY DEFINER RPCs remain the real authority. The
 * test in tests/permissions.test.mjs asserts that every `has_tenant_role`
 * role list in supabase/migrations is represented here, so the two cannot
 * drift silently.
 *
 * Permission names follow docs/02-personas-and-permissions.md.
 */
export const TENANT_ROLES = [
  "owner",
  "manager",
  "catalog_editor",
  "stock_clerk",
  "order_operator",
  "finance_viewer",
] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];

export const PERMISSIONS = {
  "products.read": ["owner", "manager", "catalog_editor"],
  "products.update": ["owner", "manager", "catalog_editor"],
  "inventory.read": ["owner", "manager", "stock_clerk"],
  "inventory.adjust": ["owner", "manager", "stock_clerk"],
  "orders.read": ["owner", "manager", "order_operator"],
  "orders.update": ["owner", "manager", "order_operator"],
  // DB read policy on orders / order_items / payment_transactions also admits
  // finance_viewer so reports can aggregate them (migrations 0008 and 0019).
  "orders.read_totals": ["owner", "manager", "order_operator", "finance_viewer"],
  "payments.record": ["owner", "manager"],
  "reports.read": ["owner", "manager", "finance_viewer"],
  "customers.manage": ["owner", "manager", "order_operator"],
  "purchasing.manage": ["owner", "manager", "stock_clerk"],
  "expenses.manage": ["owner", "manager"],
  "erp.read": ["owner", "manager"],
  "settings.store.manage": ["owner", "manager"],
  "settings.payments.manage": ["owner", "manager"],
  "staff.manage": ["owner"],
  "audit.read": ["owner"],
} as const satisfies Record<string, readonly TenantRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function isTenantRole(value: string): value is TenantRole {
  return (TENANT_ROLES as readonly string[]).includes(value);
}

export function hasPermission(role: string, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

/** `null` means "any active member of the workspace". */
export function canAccess(role: string, permission: Permission | null): boolean {
  return permission === null ? isTenantRole(role) : hasPermission(role, permission);
}

export function permissionsForRole(role: string): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((p) => hasPermission(role, p));
}
