import test from "node:test";
import assert from "node:assert/strict";
import { hasTenantPermission, TENANT_PERMISSIONS, TENANT_ROLES } from "../src/lib/tenant-permissions.ts";

test("tenant role list is explicit and stable", () => {
  assert.deepEqual(TENANT_ROLES, ["owner", "manager", "catalog_editor", "stock_clerk", "order_operator", "finance_viewer"]);
});

test("owner has every tenant permission", () => {
  for (const permission of Object.keys(TENANT_PERMISSIONS)) {
    assert.equal(hasTenantPermission("owner", permission), true, `owner should have ${permission}`);
  }
});

test("manager can run day-to-day operations but cannot manage staff", () => {
  for (const permission of ["productsRead", "productsWrite", "inventoryRead", "inventoryWrite", "ordersRead", "ordersWrite", "paymentsRecord", "reportsRead", "settingsManage"]) {
    assert.equal(hasTenantPermission("manager", permission), true);
  }
  assert.equal(hasTenantPermission("manager", "staffManage"), false);
});

test("catalog editor is limited to catalogue operations", () => {
  assert.equal(hasTenantPermission("catalog_editor", "productsRead"), true);
  assert.equal(hasTenantPermission("catalog_editor", "productsWrite"), true);
  for (const permission of ["inventoryWrite", "ordersWrite", "paymentsRecord", "reportsRead", "settingsManage", "staffManage"]) {
    assert.equal(hasTenantPermission("catalog_editor", permission), false);
  }
});

test("stock clerk cannot change catalogue, orders, payments or reports", () => {
  assert.equal(hasTenantPermission("stock_clerk", "inventoryRead"), true);
  assert.equal(hasTenantPermission("stock_clerk", "inventoryWrite"), true);
  for (const permission of ["productsWrite", "ordersWrite", "paymentsRecord", "reportsRead", "settingsManage", "staffManage"]) {
    assert.equal(hasTenantPermission("stock_clerk", permission), false);
  }
});

test("order operator is limited to order operations", () => {
  assert.equal(hasTenantPermission("order_operator", "ordersRead"), true);
  assert.equal(hasTenantPermission("order_operator", "ordersWrite"), true);
  for (const permission of ["productsWrite", "inventoryWrite", "paymentsRecord", "reportsRead", "settingsManage", "staffManage"]) {
    assert.equal(hasTenantPermission("order_operator", permission), false);
  }
});

test("finance viewer is read-only and cannot mutate business records", () => {
  assert.equal(hasTenantPermission("finance_viewer", "reportsRead"), true);
  for (const permission of ["productsWrite", "inventoryWrite", "ordersWrite", "paymentsRecord", "settingsManage", "staffManage"]) {
    assert.equal(hasTenantPermission("finance_viewer", permission), false);
  }
});

test("unknown and platform roles receive no tenant permissions", () => {
  assert.equal(hasTenantPermission("platform_admin", "reportsRead"), false);
  assert.equal(hasTenantPermission("unknown", "productsRead"), false);
});
