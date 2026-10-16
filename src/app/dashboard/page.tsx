import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth?next=/dashboard");

  const { data: memberships, error } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role, active, tenants(id, name, slug, status, currency)")
    .eq("user_id", user.id)
    .eq("active", true);

  if (error) {
    return <main className="dashboard-page"><p role="alert">Could not load your workspaces. Check the Supabase migration and RLS configuration.</p><Link href="/onboarding">Try workspace setup</Link></main>;
  }

  const tenants = (memberships ?? []).filter(item => item.tenants && item.tenants.status === "active");
  return (
    <main className="dashboard-page">
      <header className="dashboard-header"><div><p className="eyebrow">COMMERCE WORKSPACE</p><h1>Your businesses</h1><p className="auth-description">{user.email ?? "Signed-in account"}</p></div><form action="/auth/signout" method="post"><button className="secondary-button" type="submit">Sign out</button></form></header>
      <section className="workspace-list">
        {tenants.length === 0 ? <div className="empty-state"><h2>No workspace yet</h2><p>Create a business workspace to start organising its catalogue and operations.</p></div> : tenants.map(item => (
          <article className="workspace-card" key={item.tenant_id}>
            <div><h2>{item.tenants!.name}</h2><p>{item.tenants!.slug} · {item.role.replaceAll("_", " ")}</p><span className="workspace-status">{item.tenants!.currency} · active</span></div>
            <span className="coming-soon">Product management next</span>
          </article>
        ))}
        <Link className="primary-button inline-button" href="/onboarding">Create business workspace</Link>
      </section>
    </main>
  );
}
