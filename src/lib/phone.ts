/**
 * Contact-link helpers for customer phone numbers captured at checkout.
 * Numbers are free text, so every function tolerates spaces, dashes, "+" and
 * local Kenyan formats (07xx / 01xx / 7xx / 254...).
 */
export function toInternationalDigits(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) return `254${digits}`;
  // Anything else is only trusted as an international number if the length is plausible (E.164 max 15).
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function telHref(raw: string): string | null {
  const digits = toInternationalDigits(raw);
  return digits ? `tel:+${digits}` : null;
}

export function whatsappHref(raw: string, message?: string): string | null {
  const digits = toInternationalDigits(raw);
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
