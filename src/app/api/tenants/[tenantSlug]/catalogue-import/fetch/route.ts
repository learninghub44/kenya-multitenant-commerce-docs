import { NextRequest, NextResponse } from "next/server";
import { getTenantAccess } from "@/lib/access/tenant-access";
import { apiErrorForOutcome } from "@/lib/access/api";
import { fetchRemoteCatalogue, RemoteImportError } from "@/lib/catalogue-import/remote";

/**
 * Reads a public catalogue link (Google Sheets, CSV/JSON file, Shopify or WooCommerce store) and returns
 * a table for the import wizard to preview. Nothing is written here; the wizard commits through the
 * `import_catalogue_rows` RPC under the merchant's own session so RLS and role checks apply.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const access = await getTenantAccess(tenantSlug, "products.update");
  const failure = apiErrorForOutcome(access);
  if (failure) return failure;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const url = body && typeof body === "object" ? (body as Record<string, unknown>).url : undefined;
  if (typeof url !== "string" || url.length < 8 || url.length > 2000) return NextResponse.json({ error: "Enter the link to import from." }, { status: 400 });

  try {
    const table = await fetchRemoteCatalogue(url);
    return NextResponse.json(table);
  } catch (error) {
    if (error instanceof RemoteImportError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[catalogue-import] remote fetch failed", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Could not read that link. Please try again." }, { status: 500 });
  }
}
