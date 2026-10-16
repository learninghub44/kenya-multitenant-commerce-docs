import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import TenantShell from "./tenant-shell";

export default async function TenantDashboardLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}>) {
  const { tenantSlug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/auth?next=${encodeURIComponent(`/dashboard/${tenantSlug}`)}`);
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name, slug, status")
    .eq("slug", tenantSlug)
    .maybeSingle();

  if (tenantError) throw new Error("Could not verify this business workspace.");
  if (!tenant || tenant.status !== "active") notFound();

  const { data: membership, error: membershipError } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (membershipError) throw new Error("Could not verify your business access.");
  if (!membership) notFound();

  return (
    <TenantShell
      tenantSlug={tenant.slug}
      tenantName={tenant.name}
      role={membership.role}
      email={user.email ?? null}
    >
      {children}
    </TenantShell>
  );
}
