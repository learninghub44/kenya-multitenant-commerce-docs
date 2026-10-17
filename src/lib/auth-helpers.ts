export function getSafeNextPath(requested: string | null | undefined, origin: string, fallback = "/dashboard"): string {
  if (!requested || !requested.startsWith("/") || requested.startsWith("//") || requested.includes("\\")) return fallback;
  try {
    const destination = new URL(requested, origin);
    return destination.origin === origin ? `${destination.pathname}${destination.search}${destination.hash}` : fallback;
  } catch {
    return fallback;
  }
}

export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { id: "letter", label: "A letter", test: (value: string) => /[A-Za-z]/.test(value) },
  { id: "number", label: "A number", test: (value: string) => /\d/.test(value) },
] as const;

export function passwordProblem(value: string): string | null {
  if (value.length > 128) return "Password must be 128 characters or fewer.";
  const failed = PASSWORD_RULES.find((rule) => !rule.test(value));
  return failed ? `Password needs: ${failed.label.toLowerCase()}.` : null;
}

// Accepts 07XX, 01XX, 254XXXXXXXXX and +254XXXXXXXXX. Returns +254XXXXXXXXX or null.
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, "");
  const match = /^(?:\+?254|0)([71]\d{8})$/.exec(digits);
  return match ? `+254${match[1]}` : null;
}

export function friendlyAuthError(message: string): { text: string; code?: "unconfirmed" } {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return { text: "The email or password is incorrect." };
  if (lower.includes("email not confirmed")) return { text: "Confirm your email first. Check your inbox for the link.", code: "unconfirmed" };
  if (lower.includes("rate limit") || lower.includes("too many") || lower.includes("security purposes")) {
    return { text: "Too many attempts. Wait a minute and try again." };
  }
  if (lower.includes("weak") || lower.includes("password should")) return { text: "Choose a stronger password with at least 8 characters, a letter and a number." };
  if (lower.includes("provider is not enabled") || lower.includes("unsupported provider")) {
    return { text: "Google sign-in is not switched on for this app yet." };
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) return { text: "Could not reach the server. Check your connection and try again." };
  return { text: "Something went wrong. Please try again." };
}
