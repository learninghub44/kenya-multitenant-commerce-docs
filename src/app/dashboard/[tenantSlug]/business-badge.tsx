"use client";

import { useEffect, useState } from "react";

export function BusinessIdChip({ code, className = "" }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  }
  return (
    <button type="button" className={`biz-id ${className}`.trim()} onClick={copy} aria-label={`Business ID ${code}. Copy`}>
      <span>ID</span><strong>{code}</strong><em aria-hidden="true">{copied ? "Copied" : "Copy"}</em>
    </button>
  );
}

export function BusinessClock({ timezone, className = "" }: { timezone: string; className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <span className={`biz-clock ${className}`.trim()} aria-hidden="true">&nbsp;</span>;
  let time = "", day = "";
  try {
    time = new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: timezone }).format(now);
    day = new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short", timeZone: timezone }).format(now);
  } catch {
    time = now.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });
    day = now.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
  }
  return <span className={`biz-clock ${className}`.trim()}><strong>{time}</strong> · {day}</span>;
}
