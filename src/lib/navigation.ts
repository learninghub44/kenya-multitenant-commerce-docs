import { canAccess, type Permission } from "./permissions.ts";

export type NavItem = {
  label: string;
  /** Path under /dashboard/[tenantSlug]; "" is the overview. */
  path: string;
  group: "Workspace" | "Sales" | "Operations" | "Manage" | "Help";
  /** Permission required to see and open this page; null = any active member. */
  permission: Permission | null;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Overview", path: "", group: "Workspace", permission: null },
  { label: "Orders", path: "/orders", group: "Sales", permission: "orders.update" },
  { label: "Products", path: "/products", group: "Sales", permission: "products.update" },
  { label: "Categories", path: "/categories", group: "Sales", permission: "products.update" },
  { label: "Inventory", path: "/inventory", group: "Operations", permission: "inventory.adjust" },
  { label: "Business records", path: "/erp", group: "Operations", permission: "erp.read" },
  { label: "Reports", path: "/reports", group: "Operations", permission: "reports.read" },
  { label: "Settings", path: "/settings", group: "Manage", permission: "settings.store.manage" },
  { label: "Payments & integrations", path: "/payments", group: "Manage", permission: "settings.payments.manage" },
  { label: "Team", path: "/team", group: "Manage", permission: "staff.manage" },
  { label: "Activity", path: "/activity", group: "Manage", permission: "audit.read" },
  { label: "Support", path: "/support", group: "Help", permission: null },
];

export function navItemsForRole(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccess(role, item.permission));
}
