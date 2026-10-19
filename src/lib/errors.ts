// Supabase/PostgREST errors are plain objects with a `message`, not Error instances, so
// `cause instanceof Error` would hide useful messages like "Only 3 available".
export function errorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message) return cause.message;
  if (cause && typeof cause === "object" && "message" in cause && typeof (cause as { message: unknown }).message === "string") {
    const message = (cause as { message: string }).message;
    if (message) return message;
  }
  return fallback;
}
