import test from "node:test";
import assert from "node:assert/strict";
import { toInternationalDigits, telHref, whatsappHref } from "../src/lib/phone.ts";
import { ORDER_FILTERS, countByFilter, filterOrders, matchesSearch } from "../src/lib/order-filters.ts";

test("Kenyan phone formats normalise to 254 digits", () => {
  for (const raw of ["0712 345 678", "+254712345678", "254712345678", "712345678", "0712-345-678", "00254712345678", "0112345678"]) {
    const digits = toInternationalDigits(raw);
    assert.ok(digits?.startsWith("254") && digits.length === 12, `${raw} -> ${digits}`);
  }
  assert.equal(toInternationalDigits("0712 345 678"), "254712345678");
  assert.equal(toInternationalDigits("0112345678"), "254112345678");
});

test("unusable numbers give no contact link instead of a broken one", () => {
  for (const raw of ["", "   ", "n/a", "123", "1234567890123456789"]) {
    assert.equal(toInternationalDigits(raw), null, raw);
    assert.equal(telHref(raw), null, raw);
    assert.equal(whatsappHref(raw), null, raw);
  }
});

test("international non-Kenyan numbers are kept; links are well formed", () => {
  assert.equal(toInternationalDigits("+1 415 555 0132"), "14155550132");
  assert.equal(telHref("0712345678"), "tel:+254712345678");
  assert.equal(whatsappHref("0712345678"), "https://wa.me/254712345678");
  assert.equal(whatsappHref("0712345678", "Hi & thanks"), "https://wa.me/254712345678?text=Hi%20%26%20thanks");
});

const order = (over = {}) => ({
  order_number: "ORD-1001", status: "pending", payment_status: "pending",
  customer_name_snapshot: "Wanjiku Kamau", customer_phone_snapshot: "+254712345678",
  items: [{ product_title_snapshot: "Sukuma bunch", variant_title_snapshot: "Large", sku_snapshot: "SUK-L" }], ...over
});

test("filters partition orders as merchants expect", () => {
  const orders = [
    order({ order_number: "A", status: "pending", payment_status: "pending" }),
    order({ order_number: "B", status: "processing", payment_status: "succeeded" }),
    order({ order_number: "C", status: "fulfilled", payment_status: "succeeded" }),
    order({ order_number: "D", status: "cancelled", payment_status: "pending" })
  ];
  const names = (f) => filterOrders(orders, f, "").map(o => o.order_number).join("");
  assert.equal(names("all"), "ABCD");
  assert.equal(names("open"), "AB");
  assert.equal(names("unpaid"), "A"); // cancelled-unpaid is not "owed"
  assert.equal(names("fulfilled"), "C");
  assert.equal(names("cancelled"), "D");
  assert.deepEqual(countByFilter(orders), { all: 4, open: 2, unpaid: 1, fulfilled: 1, cancelled: 1 });
  assert.deepEqual(ORDER_FILTERS.map(f => f.value), ["all", "open", "unpaid", "fulfilled", "cancelled"]);
});

test("search matches number, name, items, sku and phone in any format", () => {
  const o = order();
  for (const q of ["ord-1001", "wanjiku", "SUKUMA large", "suk-l", "0712 345 678", "254712345678", "712345678", ""]) {
    assert.ok(matchesSearch(o, q), q);
  }
  for (const q of ["maria", "ORD-9999", "0799 000 000", "sukuma small"]) {
    assert.ok(!matchesSearch(o, q), q);
  }
});
