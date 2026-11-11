"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AuthShell from "@/app/auth/auth-shell";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AcceptInvitationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [status, setStatus] = useState<"loading" | "ready" | "accepted" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      const { data } = await createSupabaseBrowserClient().auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        router.replace(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
        return;
      }
      setStatus("ready");
    }
    checkSession().catch(() => { if (!cancelled) { setError("Could not verify your session. Sign in and open the invitation again."); setStatus("error"); } });
    return () => { cancelled = true; };
  }, [router, token]);

  async function accept() {
    setStatus("loading"); setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: tenantId, error: rpcError } = await supabase.rpc("accept_tenant_invitation", { p_token: token });
      if (rpcError) throw rpcError;
      const { data: tenant, error: tenantError } = await supabase.from("tenants").select("slug").eq("id", tenantId).maybeSingle();
      if (tenantError || !tenant) throw new Error("Invitation accepted, but the workspace could not be opened. Go to your dashboard.");
      setStatus("accepted");
      router.replace(`/dashboard/${tenant.slug}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This invitation could not be accepted.");
      setStatus("error");
    }
  }

  return <AuthShell headline="Join a business " accent="workspace." summary="Accept the invitation using the email address it was sent to.">
    <section className="auth-card">
      <p className="eyebrow">Team invitation</p>
      <h1>Join this workspace</h1>
      {status === "loading" && <p className="auth-description" role="status">Checking your sign-in…</p>}
      {status === "ready" && <><p className="auth-description">Accept this one-time invitation to join the business team.</p><button className="primary-button" type="button" onClick={accept}>Accept invitation</button></>}
      {status === "accepted" && <p className="form-message" role="status">Invitation accepted. Opening your workspace…</p>}
      {status === "error" && <p className="form-message error" role="alert">{error}</p>}
      <p className="auth-switch"><Link href="/dashboard">Go to your dashboard</Link></p>
    </section>
  </AuthShell>;
}
