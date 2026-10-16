# Testing and Acceptance Criteria

## Layers
Unit tests: pricing, permissions, state transitions, stock availability, provider normalization. Integration tests: transactions, RLS, storage authorization, webhooks, outbox. E2E: onboarding, publish product, storefront, checkout, payment, fulfilment, cancellation. Security: IDOR, privilege escalation, upload validation, replay, rate limits. Operations: migration from empty database, backup/restore, provider outage, job retry, monitoring.

## Acceptance
1. Merchant creates, edits, publishes, and unpublishes products.
2. Only published products appear on the correct storefront.
3. Historical order snapshots survive product edits.
4. Checkout rejects tampered prices and discounts.
5. Concurrent checkout cannot sell the same final stock unit twice.
6. Every stock balance change has a ledger movement and retries do not double-apply.
7. Valid payment callback applies once; invalid/duplicate callback cannot double-confirm.
8. Browser redirect alone never marks order paid.
9. Tenant A cannot access Tenant B records with guessed IDs.
10. Staff permissions block unauthorized operations.
11. Unknown/disabled subdomains show safe unavailable/not-found page.
12. Public cache never leaks tenant-private data.
13. Notification failure does not roll back a committed payment.
14. Fresh database can be built from migrations and documented configuration.
15. Mobile and keyboard users can complete core workflows.

Release only after critical payment, inventory, and tenant security tests pass.