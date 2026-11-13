import "server-only";

/**
 * Use when a server-side data load fails. Diagnostic detail (Postgres/PostgREST
 * code and message) goes to server logs only; the user sees the dashboard
 * error boundary with a request ID (the Next.js error digest), never schema or
 * migration hints.
 */
export function failLoad(context: string, error: unknown): never {
  const detail = error && typeof error === "object"
    ? { code: (error as { code?: string }).code, message: (error as { message?: string }).message }
    : { message: String(error) };
  console.error(`[dashboard] load failed: ${context}`, detail);
  throw new Error("Could not load this page.");
}
