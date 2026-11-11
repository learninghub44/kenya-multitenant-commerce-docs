# Platform administration app

This is a separate Next.js application and Cloudflare Worker within the monorepo. It has its own deployment, environment variables, hostname and authentication entry point. It does not share tenant dashboard routes or tenant membership permissions.

## Security model

- Supabase Auth sign-in, followed by TOTP authenticator MFA at assurance level AAL2.
- Every privileged RPC independently checks the active `platform_admins` record and AAL2 claim.
- Tenant membership never grants platform-admin access.
- The app uses only the public Supabase URL and anon key. Do not add a service-role key.
- The console shows tenant-level operational summaries only. It does not expose customer/order details, payment credentials or impersonation.
- Only super admins and operations admins can suspend/reactivate tenants. Every change requires a reason and creates a platform audit record.
- No direct browser writes to platform-admin or audit tables.

## First operator provisioning

1. Create the intended operator account in Supabase Auth.
2. Sign in to this app once and complete TOTP MFA enrollment.
3. Using the Supabase SQL editor under the project owner/database administrator account, grant the account access. Replace the email and choose the least-privilege role:

```sql
insert into public.platform_admins (user_id, role, active)
select id, 'super_admin', true
from auth.users
where lower(email) = lower('replace-with-verified-operator-email@example.com');
```

4. Verify that exactly one intended account was inserted. Do not add tenant IDs to the platform-admin table.
5. Provision further operators through a controlled database-owner process and review access periodically.

## Deploy independently to Cloudflare

Create a separate Worker service named `kenya-commerce-platform-admin` using this directory as the build root. Configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Install and build:

```sh
npm install
npm run typecheck
npm run lint
npm run build
npm run build:cloudflare
npm run deploy
```

Attach a dedicated admin hostname to this Worker. Keep it separate from the merchant app Worker. Do not deploy this app under a merchant storefront subdomain. The app is not production-ready until the migration is reviewed/applied through the normal release process, the first operator is provisioned, MFA is tested, and the separate Worker has been configured.
