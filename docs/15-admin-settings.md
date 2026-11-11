# Merchant and Platform Administration

## Merchant settings
Store name/slug/logo/contact; currency and timezone; delivery zones/rates/pickup; stock policy, reorder thresholds and reservation timeout; payment provider connections; staff invites/roles; notification preferences; account export/privacy requests.

Mask payment secrets after saving. Payment credential changes require appropriate re-authentication and audit.

## Platform admin
Search tenants and review technical health, suspend/reactivate with reason, manage reserved subdomains, inspect webhook/reconciliation failures, and respond to abuse. Avoid unrestricted browsing of merchant customer data. Support access should be time-limited, least-privilege, and audited. Never implement a hidden impersonation bypass.

Define tenant creation, suspension, reactivation, export, deletion, and retention behavior. Suspension must predictably block store/merchant actions while preserving records required for reconciliation or legal obligations.

## Team management
Only active workspace owners can list team members, create/revoke invitations, change roles, remove members or view the activity log. Invitations can grant manager, catalog editor, stock clerk, order operator or finance viewer access; they cannot grant owner access. Existing owners can promote another active member to owner. Role changes and removals serialize per tenant and reject any operation that would leave the workspace without an active owner. Membership writes remain RPC-only.
