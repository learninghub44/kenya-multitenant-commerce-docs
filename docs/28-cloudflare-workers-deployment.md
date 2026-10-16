# Cloudflare Workers Deployment

This repository uses Next.js 15 App Router and middleware. The initial deployment target is a temporary `workers.dev` URL; custom domains and wildcard tenant subdomains are a later step.

## Important safety gate

Do not link this app to an unrelated Supabase project. Confirm that the project is dedicated to Kenya Multi-Tenant Commerce before applying migrations. Back up an existing project and review the migration plan first. The repository migrations create and modify commerce tables, policies, and RPCs; do not run them against another application's database.

## Runtime configuration

- `wrangler.jsonc` uses the OpenNext Cloudflare adapter, `nodejs_compat`, static assets, and Worker observability.
- `open-next.config.ts` uses the default Cloudflare OpenNext configuration.
- `npm run preview` builds and runs the app in the local Workers runtime.
- `npm run deploy` builds the OpenNext output and deploys it with Wrangler.
- The Worker is configured to publish on `workers.dev` initially.

## Required environment variables

Configure variables in Cloudflare Worker settings and in Workers Builds build variables/secrets if using Git-connected builds. `NEXT_PUBLIC_*` values must be available during the Next.js build because they are compiled into client bundles.

| Variable | Type | Purpose |
| --- | --- | --- |
| `APP_URL` | Non-secret variable | Canonical root application URL. Set to the temporary Worker URL for the first deployment. |
| `NEXT_PUBLIC_APP_URL` | Public variable | Canonical app URL where required by the UI. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public variable | URL for the dedicated commerce Supabase project. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public variable | Supabase publishable/legacy anon key; database access must still be protected by RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Server-only privileged key if the server admin client is used. Never prefix with `NEXT_PUBLIC_`. |
| `CLOUDINARY_CLOUD_NAME` | Variable | Cloudinary account name for product images. |
| `CLOUDINARY_API_KEY` | Variable/secret | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Secret | Server-side signing secret. |
| `CRON_SECRET` | Secret, if scheduled jobs are enabled | Authentication for scheduled operations. |

Do not commit real values to `wrangler.jsonc`, GitHub, or `.env.example`. Set secrets with Cloudflare's secret management or `wrangler secret put VARIABLE_NAME`.

## First deployment checklist

1. Install Node.js 22 or newer and npm.
2. Install the repository dependencies with `npm install`. The repository currently has no committed lockfile; generate and commit `package-lock.json` before treating builds as reproducible.
3. Authenticate Wrangler with `npx wrangler login`.
4. Configure the public Supabase URL and key as build variables and the service-role and Cloudinary secrets as secrets.
5. Set `APP_URL` and `NEXT_PUBLIC_APP_URL` to the eventual `workers.dev` URL. After the first deploy, update them to the actual URL shown by Wrangler and rebuild/redeploy if the value changed.
6. Run `npm run typecheck`, `npm run lint`, `npm run build`, then `npm run preview`.
7. Deploy using `npm run deploy` and copy the actual URL printed by Wrangler. Do not guess the account-specific `workers.dev` hostname.
8. In Supabase Auth URL Configuration, set the Site URL to the deployed URL and add the deployed URL plus required auth callback paths to Redirect URLs. Verify sign-in and sign-out.
9. Smoke-test the homepage, auth page, onboarding, dashboard after login, and `/store/<tenant-slug>`. A temporary `workers.dev` hostname does not provide wildcard merchant subdomains.
10. Configure a dedicated commerce Supabase project, review the migrations, and run `supabase db push --dry-run` before applying them. Run migrations only after confirming the target project reference and backup.

## Tenant routing

The app's middleware rewrites wildcard subdomains to `/store/<tenant-slug>` only when the request host is a subdomain of `APP_URL`. On the temporary Worker URL, use the explicit path `/store/<tenant-slug>`. Once a custom root domain is available, configure the root and wildcard DNS/Worker routing, set `APP_URL` to the root domain (for example `https://example.co.ke`), and test reserved hostnames and tenant isolation.

## Not a production-readiness declaration

The storefront currently creates order requests, not online payments. Daraja/PayHero provider callbacks and settlement reconciliation are not implemented. Before live traffic, complete the security checklist, verify tenant isolation and RLS against a dedicated staging database, configure backups, and test rollback/recovery.
