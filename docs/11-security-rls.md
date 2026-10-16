# Security, Supabase RLS, and Authorization

Enable RLS on every tenant-owned table before exposing it through Supabase APIs. Use authentication, server-side permission checks, RLS, constraints, and audit logging together.

- Tenant membership must come from trusted database state; do not rely only on user-editable JWT metadata.
- Reads require active membership and appropriate permission.
- Writes validate membership, role, tenant ownership, and business rules.
- Public storefront policies expose only approved published catalogue fields.
- Service-role keys must never be exposed to browsers.
- Payment callback processing uses controlled server-only credentials or restricted database functions.
- Platform administration is separate from tenant membership and audited.
- Composite constraints prevent cross-tenant references between orders, products, customers, and payment attempts.

Threat model: cross-tenant IDOR, forged tenant headers, privilege escalation, mass assignment, malicious uploads/CSV, webhook spoofing/replay, duplicate checkout, stock races, amount tampering, brute force, secret leakage, and public-cache leakage.

Operational controls: schema validation, rate limits, secure cookies, appropriate CSRF protection, safe CORS/CSP, security headers, secret rotation, redacted logs, backups, restore drills, and incident response.

Required tests: Tenant A cannot read or mutate Tenant B products, stock, orders, connections, suppliers, expenses, or audit data. Anonymous visitors only see intended published storefront data. Staff cannot perform owner-only actions. Invalid and replayed callbacks are rejected. Test against real Postgres RLS in CI, not mocks alone.