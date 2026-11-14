/**
 * Period selection and trend bucketing for the Reports page.
 * Kenya observes no daylight saving, so Nairobi is a fixed UTC+3 and calendar days can be
 * computed deterministically (same result on server, browser and in tests).
 */
export type RangeKey = "7d" | "30d" | "90d" | "all";

export const RANGES: { value: RangeKey; label: string; days: number | null }[] = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "90d", label: "90 days", days: 90 },
  { value: "all", label: "All time", days: null }
];

const DAY_MS = 86_400_000;
const NAIROBI_OFFSET_MS = 3 * 3_600_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseRange(value: string | string[] | undefined): RangeKey {
  const first = Array.isArray(value) ? value[0] : value;
  return RANGES.some(range => range.value === first) ? (first as RangeKey) : "30d";
}

/** Calendar day (YYYY-MM-DD) in Nairobi for an instant. */
export function nairobiDayKey(input: Date | string | number): string {
  return new Date(new Date(input).getTime() + NAIROBI_OFFSET_MS).toISOString().slice(0, 10);
}

/** First Nairobi day included in the range, or null for all time. "7 days" = today plus the previous six. */
export function rangeStartKey(range: RangeKey, now: Date): string | null {
  const days = RANGES.find(item => item.value === range)?.days;
  return days ? nairobiDayKey(now.getTime() - (days - 1) * DAY_MS) : null;
}

export type TrendPoint = { key: string; label: string; total: number };

function dayLabel(key: string) {
  return `${Number(key.slice(8, 10))} ${MONTHS[Number(key.slice(5, 7)) - 1]}`;
}
function monthLabel(key: string) {
  return `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
}

/**
 * Paid-sales trend: one bar per day for 7/30 days, one per calendar month for 90 days / all time
 * (all time shows at most the latest 12 months). Empty periods are kept as zero so gaps are visible.
 */
export function bucketSales(orders: { created_at: string; total_minor: number }[], range: RangeKey, now: Date): TrendPoint[] {
  const daily = range === "7d" || range === "30d";
  const startKey = rangeStartKey(range, now);
  const todayKey = nairobiDayKey(now);
  const totals = new Map<string, number>();
  for (const order of orders) {
    const day = nairobiDayKey(order.created_at);
    if (startKey && day < startKey) continue;
    if (day > todayKey) continue;
    const key = daily ? day : day.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + order.total_minor);
  }

  const points: TrendPoint[] = [];
  if (daily) {
    const days = range === "7d" ? 7 : 30;
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const key = nairobiDayKey(now.getTime() - offset * DAY_MS);
      points.push({ key, label: dayLabel(key), total: totals.get(key) ?? 0 });
    }
    return points;
  }

  const endMonth = todayKey.slice(0, 7);
  const startMonth = startKey ? startKey.slice(0, 7) : [...totals.keys()].sort()[0] ?? endMonth;
  let [year, month] = startMonth.split("-").map(Number);
  const [endYear, endMon] = endMonth.split("-").map(Number);
  while (year < endYear || (year === endYear && month <= endMon)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    points.push({ key, label: monthLabel(key), total: totals.get(key) ?? 0 });
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return points.slice(-12);
}
