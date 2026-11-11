export const TENANT_ROLES = [
  "owner",
  "manager",
  "catalog_editor",
  "stock_clerk",
  "order_operator",
  "finance_viewer",
] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];

export const TENANT_PERMISSIONS = {
  productsRead: ["owner", "manager", "catalog_editor"],
  productsWrite: ["owner", "manager", "catalog_editor"],
  inventoryRead: ["owner", "manager", "stock_clerk"],
  inventoryWrite: ["owner", "manager", "stock_clerk"],
  ordersRead: ["owner", "manager", "order_operator"],
  ordersWrite: ["owner", "manager", "order_operator"],
  reportsRead: ["owner", "manager", "finance_viewer"],
  settingsManage: ["owner", "manager"],
  staffManage: ["owner"],
} as const satisfies Record<string, readonly TenantRole[]>;

export function hasTenantPermission(
  role: string,
  permission: keyof typeof TENANT_PERMISSIONS,
): boolean {
  return (TENANT_PERMISSIONS[permission] as readonly string[]).includes(role);
}
