# Merchant and Platform Administration

## Merchant settings
Store name/slug/logo/contact; currency and timezone; delivery zones/rates/pickup; stock policy, reorder thresholds and reservation timeout; payment provider connections; staff invites/roles; notification preferences; account export/privacy requests.

Mask payment secrets after saving. Payment credential changes require appropriate re-authentication and audit.

## Platform admin
Search tenants and review technical health, suspend/reactivate with reason, manage reserved subdomains, inspect webhook/reconciliation failures, and respond to abuse. Avoid unrestricted browsing of merchant customer data. Support access should be time-limited, least-privilege, and audited. Never implement a hidden impersonation bypass.

Define tenant creation, suspension, reactivation, export, deletion, and retention behavior. Suspension must predictably block store/merchant actions while preserving records required for reconciliation or legal obligations.