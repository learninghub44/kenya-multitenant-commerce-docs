import test from "node:test";
import assert from "node:assert/strict";
import { RANGES, bucketSales, nairobiDayKey, parseRange, rangeStartKey } from "../src/lib/report-periods.ts";

const now = new Date("2026-11-14T10:00:00Z"); // 13:00 in Nairobi

test("parseRange accepts only known ranges and defaults to 30 days", () => {
  assert.equal(parseRange("7d"), "7d");
  assert.equal(parseRange(["90d", "7d"]), "90d");
  for (const bad of [undefined, "", "1y", "ALL", "7d; drop"]) assert.equal(parseRange(bad), "30d");
  assert.deepEqual(RANGES.map(r => r.value), ["7d", "30d", "90d", "all"]);
});

test("a late-evening UTC order belongs to the next Nairobi day", () => {
  assert.equal(nairobiDayKey("2026-11-13T21:30:00Z"), "2026-11-14"); // 00:30 Nairobi
  assert.equal(nairobiDayKey("2026-11-13T20:59:00Z"), "2026-11-13");
});

test("range starts include today plus the previous days", () => {
  assert.equal(rangeStartKey("7d", now), "2026-11-08");
  assert.equal(rangeStartKey("30d", now), "2026-10-16");
  assert.equal(rangeStartKey("all", now), null);
});

test("daily buckets: fixed length, zeros kept, out-of-range orders ignored", () => {
  const orders = [
    { created_at: "2026-11-14T08:00:00Z", total_minor: 1000 },
    { created_at: "2026-11-14T09:00:00Z", total_minor: 500 },
    { created_at: "2026-11-09T12:00:00Z", total_minor: 700 },
    { created_at: "2026-11-07T12:00:00Z", total_minor: 9999 }, // before the 7-day window
    { created_at: "2026-11-20T12:00:00Z", total_minor: 8888 }  // in the future
  ];
  const points = bucketSales(orders, "7d", now);
  assert.equal(points.length, 7);
  assert.equal(points[0].key, "2026-11-08");
  assert.equal(points.at(-1).key, "2026-11-14");
  assert.equal(points.at(-1).total, 1500);
  assert.equal(points.find(p => p.key === "2026-11-09").total, 700);
  assert.equal(points.reduce((s, p) => s + p.total, 0), 2200);
  assert.equal(points.at(-1).label, "14 Nov");
  assert.equal(bucketSales([], "30d", now).length, 30);
});

test("monthly buckets for 90 days and all time", () => {
  const orders = [
    { created_at: "2026-11-02T12:00:00Z", total_minor: 100 },
    { created_at: "2026-09-20T12:00:00Z", total_minor: 200 },
    { created_at: "2025-01-05T12:00:00Z", total_minor: 300 }
  ];
  const ninety = bucketSales(orders, "90d", now); // window starts 2026-08-17
  assert.deepEqual(ninety.map(p => p.key), ["2026-08", "2026-09", "2026-10", "2026-11"]);
  assert.deepEqual(ninety.map(p => p.total), [0, 200, 0, 100]);
  const all = bucketSales(orders, "all", now);
  assert.equal(all.length, 12); // capped to the latest 12 months
  assert.equal(all.at(-1).key, "2026-11");
  assert.equal(all.at(-1).label, "Nov 2026");
  assert.equal(bucketSales([], "all", now).length, 1);
});
