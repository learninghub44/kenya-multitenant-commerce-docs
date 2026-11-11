# Notifications and Audit Trail

## Notifications
Potential events: welcome, low stock, order received, payment confirmed, dispatched, pickup ready, delivered, cancellation, refund outcome, staff invitation, payment connection issue, and security-sensitive account changes. Start with email and in-app order status; add SMS/WhatsApp after provider, consent, and cost are confirmed.

Use an outbox/queue where notifications must follow a committed transaction. Track status, attempts, last safe error category, and provider reference. Retry with backoff and deduplicate. Notification failure must not undo a verified payment or stock movement.

## Audit
Record actor, tenant, action, resource type/ID, timestamp, request ID, and safe metadata. Audit product publishing and price changes, stock movements, receiving, order transitions, payment settings, refunds, staff roles, exports, and platform-admin access.

Do not log passwords, tokens, payment credentials, or unnecessary customer data. Ordinary app users cannot edit/delete audit history. Define retention and access policy.

## Staff invitations
Tenant owners create a single-use invitation for a non-owner role. The invitation token is returned once to the owner for private sharing; only its SHA-256 digest is stored. Links expire after seven days, can be revoked, and can only be accepted by an authenticated account whose verified email matches the invitation. Email delivery is not configured in this release, so the owner must send the link through a trusted channel. Do not paste invitation links into public channels.

## Activity history
Team role changes, invitation creation/revocation/acceptance and member removal append audit events. Audit records are read through an owner-checked RPC; the browser cannot insert, update or delete audit history. The activity screen exposes actor, action, entity and timestamp, not raw metadata or secrets.
