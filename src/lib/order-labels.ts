export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  processing: "Being prepared",
  ready_for_fulfilment: "Ready",
  fulfilled: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function formatMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

export type BuyerOrder = {
  order_id: string; order_number: string; status: string; payment_status: string;
  total_minor: number; currency: string; created_at: string;
  store_name: string; store_slug: string; store_phone: string | null; store_whatsapp: string | null;
  items: { title: string; variant: string; quantity: number; unit_price_minor: number }[];
};
