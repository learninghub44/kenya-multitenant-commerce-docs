import { redirect } from "next/navigation";

// Old entry point. Existing links and redirects (`/auth?next=…`) land here.
export default async function AuthRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const query = new URLSearchParams();
  for (const key of ["next", "error"]) {
    const value = first(params[key]);
    if (value) query.set(key, value);
  }
  const mode = first(params.mode);
  const target = mode === "signup" || mode === "register" ? "/register" : "/login";
  redirect(query.size ? `${target}?${query.toString()}` : target);
}
