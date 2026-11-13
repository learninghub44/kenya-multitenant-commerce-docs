import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PERMISSIONS, TENANT_ROLES, canAccess } from "../src/lib/permissions.ts";
import { NAV_ITEMS, navItemsForRole } from "../src/lib/navigation.ts";
import { resolveAccessOutcome } from "../src/lib/access/outcome.ts";

const key = (roles) => [...roles].sort().join(",");

test("every nav item references a real permission (or null for any member)", () => {
  for (const item of NAV_ITEMS) {
    assert.ok(item.permission === null || item.permission in PERMISSIONS, `${item.label} uses unknown permission`);
  }
});

test("the sidebar shows exactly the pages each role may open", () => {
  for (const role of TENANT_ROLES) {
    const shown = navItemsForRole(role).map((i) => i.path);
    const allowed = NAV_ITEMS.filter((i) => i.permission === null || PERMISSIONS[i.permission].includes(role)).map((i) => i.path);
    assert.deepEqual(shown, allowed, role);
  }
});

test("finance viewers cannot see staff, audit or payments navigation", () => {
  const paths = navItemsForRole("finance_viewer").map((i) => i.path);
  assert.deepEqual(paths, ["", "/reports", "/support"]);
});

test("owner sees every page; unknown roles see none", () => {
  assert.equal(navItemsForRole("owner").length, NAV_ITEMS.length);
  assert.deepEqual(navItemsForRole("platform_admin"), []);
  assert.equal(canAccess("platform_admin", null), false);
});

// --- SQL parity: the DB (has_tenant_role arrays) must not drift from the app map ---
const dir = new URL("../supabase/migrations/", import.meta.url);
const sqlSets = new Set();
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
  const sql = readFileSync(new URL(file, dir), "utf8");
  for (const m of sql.matchAll(/has_tenant_role\s*\([^;]*?array\s*\[([^\]]+)\]/gi)) {
    const roles = [...m[1].matchAll(/'([a-z_]+)'/g)].map((r) => r[1]);
    if (roles.length) sqlSets.add(key(roles));
  }
}
const appSets = new Set(Object.values(PERMISSIONS).map(key));

test("every role list used by Postgres RLS/RPCs exists in the application permission map", () => {
  assert.ok(sqlSets.size > 0, "no has_tenant_role arrays found; parity check is not exercising anything");
  for (const set of sqlSets) assert.ok(appSets.has(set), `SQL uses role set [${set}] that has no application permission`);
});

test("every application role set is enforced somewhere in Postgres", () => {
  for (const set of appSets) assert.ok(sqlSets.has(set), `app role set [${set}] has no matching has_tenant_role array in migrations`);
});

// --- access outcome (pure decision behind requireTenantAccess) ---
const active = { status: "active", role: "manager" };

test("signed-out users go to login before anything else", () => {
  assert.equal(resolveAccessOutcome({ authenticated: false, workspace: active, permission: null }).kind, "login");
});

test("non-members and unknown roles get not_found, never a hint the workspace exists", () => {
  assert.equal(resolveAccessOutcome({ authenticated: true, workspace: null, permission: null }).kind, "not_found");
  assert.equal(resolveAccessOutcome({ authenticated: true, workspace: { status: "active", role: "platform_admin" }, permission: null }).kind, "not_found");
});

test("suspended, closed and unrecognised tenant statuses are unavailable (fail closed)", () => {
  for (const status of ["suspended", "closed", "weird"]) {
    assert.equal(resolveAccessOutcome({ authenticated: true, workspace: { status, role: "owner" }, permission: "products.read" }).kind, "unavailable", status);
  }
});

test("missing permission is denied and cannot escalate by role string", () => {
  assert.equal(resolveAccessOutcome({ authenticated: true, workspace: { status: "active", role: "stock_clerk" }, permission: "staff.manage" }).kind, "denied");
  assert.equal(resolveAccessOutcome({ authenticated: true, workspace: { status: "active", role: "owner" }, permission: "staff.manage" }).kind, "ok");
});
