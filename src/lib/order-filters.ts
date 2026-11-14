/** Pure filtering for the Orders board. Runs over rows the server already authorised. */
export type OrderFilter = "all" | "open" | "unpaid" | "fulfilled" | "cancelled";

export const ORDER_FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "unpaid", label: "Unpaid" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" }
];

const OPEN_STATUSES = ["pending", "confirmed", "processing", "ready_for_fulfilment"];

export type FilterableOrder = {
  order_number: string;
  status: string;
  payment_status: string;
  customer_name_snapshot: string;
  customer_phone_snapshot: string;
  items: { product_title_snapshot: string; variant_title_snapshot: string; sku_snapshot: string | null }[];
};

export function matchesFilter(order: FilterableOrder, filter: OrderFilter): boolean {
  switch (filter) {
    case "all": return true;
    case "open": return OPEN_STATUSES.includes(order.status);
    case "unpaid": return order.payment_status !== "succeeded" && order.status !== "cancelled";
    case "fulfilled": return order.status === "fulfilled";
    case "cancelled": return order.status === "cancelled";
  }
}

export function matchesSearch(order: FilterableOrder, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  const phoneDigits = order.customer_phone_snapshot.replace(/\D/g, "");
  const haystack = [
    order.order_number,
    order.customer_name_snapshot,
    order.customer_phone_snapshot,
    ...order.items.flatMap(item => [item.product_title_snapshot, item.variant_title_snapshot, item.sku_snapshot ?? ""])
  ].join(" ").toLowerCase();

  // A phone-like query ("0712 345 678", "+254712345678") is compared as one number against the
  // stored one, ignoring spacing and the 0 / 254 prefix, rather than as separate words.
  const queryDigits = trimmed.replace(/\D/g, "");
  if (/^[\d\s+()-]+$/.test(trimmed) && queryDigits.length >= 6) {
    const national = queryDigits.replace(/^(00)?254/, "").replace(/^0+/, "");
    return (national.length > 0 && phoneDigits.endsWith(national)) || haystack.includes(trimmed);
  }
  return trimmed.split(/\s+/).every(term => haystack.includes(term));
}

export function filterOrders<T extends FilterableOrder>(orders: T[], filter: OrderFilter, query: string): T[] {
  return orders.filter(order => matchesFilter(order, filter) && matchesSearch(order, query));
}

export function countByFilter(orders: FilterableOrder[]): Record<OrderFilter, number> {
  const counts: Record<OrderFilter, number> = { all: orders.length, open: 0, unpaid: 0, fulfilled: 0, cancelled: 0 };
  for (const order of orders) {
    for (const key of ["open", "unpaid", "fulfilled", "cancelled"] as const) {
      if (matchesFilter(order, key)) counts[key] += 1;
    }
  }
  return counts;
}
