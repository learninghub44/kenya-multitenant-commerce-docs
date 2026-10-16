# Commerce and ERP Domain Foundation

Migration `202610160008_commerce_erp_domain.sql` adds tenant-scoped tables for customers, suppliers, orders and immutable order-line snapshots, purchase orders, purchase-order lines, goods receipts, expenses, payment transactions, a deduplicated payment-event inbox, audit events, and a notification outbox.

## Security model

- Each merchant-owned row is scoped to `tenant_id`, with composite foreign keys where records reference other tenant data.
- RLS protects tenant reads. Sensitive financial reads are restricted to owner/manager/finance roles; order/payment reads also allow order operators where appropriate.
- Browser writes are revoked for orders, payment state, webhook events, purchase workflows, expenses, audit records, and notification jobs. These must be exposed through validated server handlers or transaction-safe RPCs.
- Payment callback event IDs are unique per provider; a callback must be authenticated by provider-specific verification before it can change an order.
- Order item names, SKU, and unit prices are snapshots, so edits to catalogue records do not rewrite historical sales.
- All money is integer minor units. Currency is recorded per transaction/order.
- Notification delivery is modeled as an outbox so transient email/SMS failure can be retried without undoing a committed business transaction.

## Deliberate limitations

This migration establishes storage and access boundaries; it does not by itself implement complete customer CRUD, purchasing screens, goods receipt posting, checkout/reservations, provider callback verification, settlement reconciliation, expense screens, outbox workers, or reporting. Do not represent these modules as functional until their transaction functions, server handlers, UI, and tests are implemented. Provider-specific signatures and settlement behaviour must be validated against current official provider documentation before live use.

Apply after migrations `001` through `007` in a disposable development project first. Run the fresh-database and cross-tenant tests from the release checklist before any production migration.
