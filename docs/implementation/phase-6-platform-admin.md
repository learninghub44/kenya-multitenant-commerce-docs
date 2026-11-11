# Phase 6 — Separate platform administration app

- Added an independent Next.js app under apps/platform-admin, with its own package/configuration, Cloudflare Worker settings, hostname guidance and CI workflow.
- Platform identities live in a separate platform_admins allowlist; tenant memberships do not grant platform access.
- Server pages and narrow RPCs require Supabase MFA assurance level AAL2. The app uses only the Supabase anon key, never the service-role key.
- The console exposes tenant summary data and a reason-required suspend/reactivate action for super/operations admins; actions write to a separate platform audit log.
- No impersonation or broad merchant/customer data access is implemented.
- Initial operator provisioning is a manual database-owner operation after MFA enrollment; no account is auto-granted.
- New migration: 202611110003_platform_admin_isolation_and_rpcs.sql. Merge after PR #23 (migration 202611110002) and PR #21 (migration 202611110001) to preserve chronological migration history.
- Root and isolated app type-check, lint, Next.js build, Cloudflare OpenNext build, database-security and GitGuardian checks passed. Separate Worker deployment, MFA enrollment, bootstrap and live operational tests remain release gates.
