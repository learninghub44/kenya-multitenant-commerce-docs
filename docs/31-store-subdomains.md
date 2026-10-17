# Store subdomains and public store profile

Every store is served at `https://<slug>.<root-domain>`. `middleware.ts` rewrites single-label subdomains of `APP_URL` to `/store/<slug>`. Reserved names (`www`, `app`, `admin`, `api`, `auth`, `dashboard`, …) are blocked in the database (`create_tenant_for_current_user` and a check constraint) and in the UI, and are never treated as stores. The list lives in `src/lib/reserved-slugs.ts` and the migration; keep both in sync.

## Configuration
- `APP_URL` and `NEXT_PUBLIC_APP_URL`: root domain, for example `https://example.co.ke`.
- Cloudflare DNS: proxied wildcard record `*` pointing at the Worker/app host, plus the apex record.
- Cloudflare Workers: add a custom domain or route for `example.co.ke/*` and `*.example.co.ke/*`.
- Wildcard TLS: Cloudflare Universal SSL covers `*.example.co.ke` one level deep only, which matches this design.
- Without a real domain (localhost or `workers.dev`) shops are served at `/store/<slug>`.

## Store profile
Owners and managers edit `/dashboard/<slug>/settings`: tagline, about, logo, banner, owner introduction and photo, phone, WhatsApp, shop email, address, opening hours and social links. Data lives in `store_profiles`, written only through `save_store_profile` (role-checked, validated, audited) and read publicly through `get_public_store_profile`, which exposes only these published fields.
