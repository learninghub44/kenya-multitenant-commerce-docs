import { NextRequest, NextResponse } from "next/server";
import { getTenantAccess } from "@/lib/tenant-access";
import { hasTenantPermission } from "@/lib/tenant-permissions";
import { encryptPaymentCredentials } from "@/lib/payment-credentials";

const PROVIDERS = ["daraja", "payhero"] as const;
const ENVIRONMENTS = ["sandbox", "production"] as const;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const access = await getTenantAccess(tenantSlug);
  if (!access.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!access.tenant || !access.membership) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  if (!hasTenantPermission(access.membership.role, "settingsManage")) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const { data, error } = await access.supabase.from("tenant_payment_connections")
    .select("provider, environment, enabled, display_name, last_verified_at, updated_at")
    .eq("tenant_id", access.tenant.id);
  if (error) return NextResponse.json({ error: "Could not load payment connections. Apply the latest database migrations." }, { status: 500 });
  return NextResponse.json({ connections: data ?? [] });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const access = await getTenantAccess(tenantSlug);
  if (!access.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!access.tenant || !access.membership) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  if (!hasTenantPermission(access.membership.role, "settingsManage")) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const input = body as Record<string, unknown>;
  const provider = input.provider;
  const environment = input.environment;
  const displayName = typeof input.display_name === "string" ? input.display_name.trim().slice(0, 80) : "";
  const credentials = input.credentials;
  if (!PROVIDERS.includes(provider as typeof PROVIDERS[number])) return NextResponse.json({ error: "Choose a supported provider." }, { status: 400 });
  if (!ENVIRONMENTS.includes(environment as typeof ENVIRONMENTS[number])) return NextResponse.json({ error: "Choose sandbox or production." }, { status: 400 });
  if (!credentials || typeof credentials !== "object" || Array.isArray(credentials)) return NextResponse.json({ error: "Enter provider credentials." }, { status: 400 });
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials as Record<string, unknown>)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key) || typeof value !== "string" || value.length > 2048) return NextResponse.json({ error: "Invalid credential field." }, { status: 400 });
    if (value.trim()) clean[key] = value.trim();
  }
  if (Object.keys(clean).length === 0) return NextResponse.json({ error: "Enter at least one credential. Existing credentials are replaced when you save." }, { status: 400 });
  if (JSON.stringify(clean).length > 12000) return NextResponse.json({ error: "Credential payload is too large." }, { status: 413 });

  try {
    const encrypted = await encryptPaymentCredentials(clean);
    const { error } = await access.supabase.from("tenant_payment_connections").upsert({
      tenant_id: access.tenant.id,
      provider,
      environment,
      enabled: false,
      display_name: displayName || (provider === "daraja" ? "M-PESA Daraja" : "PayHero"),
      ...encrypted,
      credential_version: 1,
    }, { onConflict: "tenant_id,provider" });
    if (error) return NextResponse.json({ error: "Could not save provider credentials. Confirm the payment connection migration is applied." }, { status: 500 });
    return NextResponse.json({ saved: true, enabled: false, message: "Credentials encrypted and saved. Payments remain disabled until a provider connection test and callback verification are implemented." });
  } catch {
    return NextResponse.json({ error: "Secure credential storage is unavailable. Configure PAYMENT_CREDENTIALS_ENCRYPTION_KEY before saving provider credentials." }, { status: 503 });
  }
}
