import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Image uploads are not configured." }, { status: 503 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to upload images." }, { status: 401 });

    const body: unknown = await request.json();
    const uuid = /^[0-9a-f-]{36}$/i;
    if (!body || typeof body !== "object" || !("tenantId" in body) || typeof body.tenantId !== "string" || !uuid.test(body.tenantId)) {
      return NextResponse.json({ error: "Invalid tenant." }, { status: 400 });
    }
    const tenantId = body.tenantId;
    const storeKind = "kind" in body && typeof body.kind === "string" && ["logo", "banner", "owner"].includes(body.kind) ? body.kind : null;

    let folder: string;
    if (storeKind) {
      // Store branding (logo, banner, owner photo): owners and managers only.
      const { data: membership, error: membershipError } = await supabase.from("tenant_memberships")
        .select("role").eq("tenant_id", tenantId).eq("user_id", user.id).eq("active", true).maybeSingle();
      if (membershipError || !membership || !["owner", "manager"].includes(membership.role)) {
        return NextResponse.json({ error: "You cannot upload store branding to this workspace." }, { status: 403 });
      }
      folder = `commerce/${tenantId}/store/${storeKind}`;
    } else {
      if (!("productId" in body) || typeof body.productId !== "string" || !uuid.test(body.productId)) {
        return NextResponse.json({ error: "Invalid tenant or product." }, { status: 400 });
      }
      const productId = body.productId;
      const { data: membership, error: membershipError } = await supabase.from("tenant_memberships")
        .select("role").eq("tenant_id", tenantId).eq("user_id", user.id).eq("active", true).maybeSingle();
      if (membershipError || !membership || !["owner", "manager", "catalog_editor"].includes(membership.role)) {
        return NextResponse.json({ error: "You cannot upload images to this workspace." }, { status: 403 });
      }
      const { data: product, error: productError } = await supabase.from("products")
        .select("id").eq("id", productId).eq("tenant_id", tenantId).maybeSingle();
      if (productError || !product) return NextResponse.json({ error: "Product not found in this workspace." }, { status: 404 });
      folder = `commerce/${tenantId}/${productId}`;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash("sha1").update(toSign).digest("hex");
    return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature });
  } catch {
    return NextResponse.json({ error: "Could not prepare a secure image upload." }, { status: 400 });
  }
}
