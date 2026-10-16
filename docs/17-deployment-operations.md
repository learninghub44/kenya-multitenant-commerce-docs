# Deployment and Operations

Use separate development, staging/preview, and production projects and provider credentials. Confirm the host supports the required server routes, wildcard subdomains, TLS, secrets, and any background jobs. Do not assume all hosting plans support the same routing features.

Manage schema through versioned migrations and review them before release. Configure backups and test restoration. Use pooling where appropriate and avoid long transactions.

Monitor error rate, latency, database capacity, failed jobs, payment initiation/callback outcomes, reconciliation exceptions, stock conflicts, and notification delivery. Redact secrets and minimize personal data in logs. Alert on payment mismatches, webhook backlog, repeated auth failures, and unusual admin access.

Release flow: review code/migrations → run lint/type/unit/integration/RLS tests → deploy staging → test tenant routing and sandbox payments → verify secrets → deploy → smoke test storefront/dashboard/webhooks → monitor and keep rollback/forward-fix plan.

Document incident ownership, how to disable a compromised payment connection, pause checkout safely, restore data, preserve evidence, and notify affected tenants.