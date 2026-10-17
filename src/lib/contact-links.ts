export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

// wa.me needs digits only, with the country code. Kenyan 07XX/01XX numbers get 254.
export function whatsappHref(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `254${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

export function mapsHref(parts: (string | null | undefined)[]): string {
  const query = parts.filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function safeHttpsUrl(value: string | null | undefined): string | null {
  return value && /^https:\/\/[^\s]+$/.test(value) ? value : null;
}
