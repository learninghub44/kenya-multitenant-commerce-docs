import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission as hasTenantPermission, PERMISSIONS as TENANT_PERMISSIONS, TENANT_ROLES } from "../src/lib/permissions.ts";

test("tenant role list is explicit and stable", () => {
  assert.deepEqual(TENANT_ROLES, ["owner", "manager", "catalog_editor", "stock_clerk", "order_operator", "finance_viewer"]);
});

test("owner has every tenant permission", () => {
  for (const permission of Object.keys(TENANT_PERMISSIONS)) {
    assert.equal(hasTenantPermission("owner", permission), true, `owner should have ${permission}`);
  }
});

test("manager can run day-to-day operations but cannot manage staff", () => {
  for (const permission of ["products.read", "products.update", "inventory.read", "inventory.adjust", "orders.read", "orders.update", "payments.record", "reports.read", "settings.store.manage"]) {
    assert.equal(hasTenantPermission("manager", permission), true);
  }
  assert.equal(hasTenantPermission("manager", "staff.manage"), false);
});

test("catalog editor is limited to catalogue operations", () => {
  assert.equal(hasTenantPermission("catalog_editor", "products.read"), true);
  assert.equal(hasTenantPermission("catalog_editor", "products.update"), true);
  for (const permission of ["inventory.adjust", "orders.update", "payments.record", "reports.read", "settings.store.manage", "staff.manage"]) {
    assert.equal(hasTenantPermission("catalog_editor", permission), false);
  }
});

test("stock clerk cannot change catalogue, orders, payments or reports", () => {
  assert.equal(hasTenantPermission("stock_clerk", "inventory.read"), true);
  assert.equal(hasTenantPermission("stock_clerk", "inventory.adjust"), true);
  for (const permission of ["products.update", "orders.update", "payments.record", "reports.read", "settings.store.manage", "staff.manage"]) {
    assert.equal(hasTenantPermission("stock_clerk", permission), false);
  }
});

test("order operator is limited to order operations", () => {
  assert.equal(hasTenantPermission("order_operator", "orders.read"), true);
  assert.equal(hasTenantPermission("order_operator", "orders.update"), true);
  for (const permission of ["products.update", "inventory.adjust", "payments.record", "reports.read", "settings.store.manage", "staff.manage"]) {
    assert.equal(hasTenantPermission("order_operator", permission), false);
  }
});

test("finance viewer is read-only and cannot mutate business records", () => {
  assert.equal(hasTenantPermission("finance_viewer", "reports.read"), true);
  for (const permission of ["products.update", "inventory.adjust", "orders.update", "payments.record", "settings.store.manage", "staff.manage"]) {
    assert.equal(hasTenantPermission("finance_viewer", permission), false);
  }
});

test("unknown and platform roles receive no tenant permissions", () => {
  assert.equal(hasTenantPermission("platform_admin", "reports.read"), false);
  assert.equal(hasTenantPermission("unknown", "products.read"), false);
});
