# Notifications and Audit Trail

## Notifications
Potential events: welcome, low stock, order received, payment confirmed, dispatched, pickup ready, delivered, cancellation, refund outcome, staff invitation, payment connection issue, and security-sensitive account changes. Start with email and in-app order status; add SMS/WhatsApp after provider, consent, and cost are confirmed.

Use an outbox/queue where notifications must follow a committed transaction. Track status, attempts, last safe error category, and provider reference. Retry with backoff and deduplicate. Notification failure must not undo a verified payment or stock movement.

## Audit
Record actor, tenant, action, resource type/ID, timestamp, request ID, and safe metadata. Audit product publishing and price changes, stock movements, receiving, order transitions, payment settings, refunds, staff roles, exports, and platform-admin access.

Do not log passwords, tokens, payment credentials, or unnecessary customer data. Ordinary app users cannot edit/delete audit history. Define retention and access policy.