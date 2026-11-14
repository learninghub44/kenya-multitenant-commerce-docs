# Catalogue Import

Merchants can bring an existing catalogue into a workspace from **Products → Import catalogue** (`/dashboard/{slug}/products/import`).

## Sources
- **CSV / TSV / semicolon files** (up to 2,000 rows, 5 MB). Shopify and WooCommerce product exports are auto-detected; any other file gets a column-mapping step. Excel users save as CSV.
- **Pasted table** copied from Excel or Google Sheets.
- **Google Sheets share link** ("anyone with the link can view") and any public CSV/JSON link.
- **Shopify store address** (public `/products.json`) and **WooCommerce store address** (public Store API). WooCommerce stores not selling in KES are rejected.

## Behaviour
- Prices are parsed to integer cents (never floats) and always stored as KES.
- New products are **drafts** unless the merchant ticks "publish right away" (rows marked draft/unpublished in the source stay draft).
- Duplicates (same SKU, else same slug): **skip** (default) or **update** name, description, category and price of the existing product. Stock is never overwritten for existing products.
- Categories are matched by name (case-insensitive) or created.
- Opening stock is written to the append-only ledger as an `opening` movement, only for newly created variants, only when the caller's role may adjust stock (owner, manager, stock clerk).
- Invalid rows are reported and skipped; they never abort valid rows. Each batch (200 rows) is one transaction, idempotent per import key, so retrying after a network failure cannot double-import.
- Each batch is recorded in `catalogue_imports` and as a `catalogue.imported` audit event.

## Security
- Writes go through `import_catalogue_rows` (SECURITY DEFINER) which checks `auth.uid()` and `has_tenant_role` (owner, manager, catalog_editor) in the database. Tenant ID is never trusted from the browser beyond what that check verifies.
- `POST /api/tenants/{slug}/catalogue-import/fetch` requires `products.update`. It only reads and previews. Remote fetches: https and port 443 only, no IP literals, localhost or internal suffixes, manual redirects re-validated per hop, 10 s timeout, 5 MB cap. DNS rebinding cannot be fully excluded in application code; keep the runtime free of private-network egress (true on Cloudflare Workers).

## Known limitations
- Variants are flattened: each Shopify/Woo variant becomes its own product titled like "Tee (M)". Proper multi-variant products are future work.
- Images are not imported. Product images are restricted to the tenant's Cloudinary folder; remote image copying needs a separate server-side upload step.
- Shopify and WooCommerce public feeds do not expose stock levels; use their CSV export for opening stock.
- No native .xlsx or JSON file upload (JSON works via link).
- Not yet verified against a live Supabase project; apply migration `202611130002_catalogue_import.sql` and test with a real tenant before release.
