# Environment Variables

Checklist only; exact names must match the implementation. Store secrets in hosting secret storage and commit placeholders only.

## Application
- APP_URL: canonical application URL.
- NEXT_PUBLIC_APP_URL: public URL if needed; no secrets.
- NODE_ENV: runtime mode.
- LOG_LEVEL: safe logging verbosity.

## Supabase
- NEXT_PUBLIC_SUPABASE_URL: project URL.
- NEXT_PUBLIC_SUPABASE_ANON_KEY: public key protected by RLS.
- SUPABASE_SERVICE_ROLE_KEY: server-only privileged key; never expose to browser.
- Secure migration connection configuration in developer/CI environments as needed.

## Cloudinary
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET (server-only)

## Payments
Use the exact Daraja/PayHero variables required by the selected approved product and SDK. Separate sandbox and live credentials. Configure callback URLs and verification settings as required. If merchant credentials are stored, document encryption/key-management configuration.

## Operations
- CRON_SECRET or equivalent for authenticated scheduled jobs.
- Email provider credentials if email is enabled.
- Error monitoring DSN if selected.
- Internal token signing secret only if required.

Validate required variables at startup and fail fast in production. Never commit .env files, tokens, logs, or customer exports. Document secret rotation.