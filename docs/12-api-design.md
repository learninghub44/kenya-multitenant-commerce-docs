# API Design Conventions

Use typed server-side domain functions and a small set of route handlers. Validate bodies, query parameters, and IDs. Resolve tenant and actor from trusted context. Return consistent safe errors with request ID; never expose stack traces, private provider payloads, or another tenant's resource existence.

Suggested route groups:
- Merchant products, categories, inventory balances/movements/adjustments/reservations.
- Merchant orders and fulfilment.
- Suppliers, purchase orders, goods receipts, customers, expenses, reports.
- Store and payment settings.
- Public storefront products, cart, checkout.
- Provider webhook endpoints.
- Platform tenant management and audit.

Use cursor pagination and cap page sizes. Add idempotency for checkout, payment initiation, stock movements, goods receiving, and refund requests. Use transactions, locks, or version checks for concurrent stock/order transitions. Reject stale edits with a clear conflict instead of silently overwriting newer values. Routes listed here are examples; follow existing framework conventions if implementation already exists.