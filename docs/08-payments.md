# Payments: Daraja and PayHero

## Critical assumption
The platform integrates with payment providers; it does not automatically hold funds or guarantee direct merchant settlement. Each merchant's ability to connect credentials and settle to their own Till/Paybill/account depends on provider-approved products, merchant onboarding, credentials, and terms. Verify this before promising direct settlement.

## Adapter model
Create a server-side provider adapter for initiation, callback verification, status query/reconciliation where supported, and refunds where supported. Normalize provider events into internal payment attempts/events. Keep provider-specific fields within the adapter.

## Merchant configuration
Store provider, environment, enabled state, credential reference, public settings, and last verification time. Encrypt stored credentials using an appropriate key-management design. Mask secrets after save; support rotation and revocation. Never log full credentials.

## Daraja
Confirm the correct approved product for the desired merchant flow, whether each merchant needs their own credentials, and callback/settlement requirements. Keep sandbox and production isolated and follow current Safaricom documentation.

## PayHero
Confirm merchant onboarding, available channels, callback authenticity, transaction query/reconciliation, refund support, fees, settlement timelines, and whether per-merchant credential configuration is permitted. Do not assume one platform account can settle independently to every merchant.

## Payment lifecycle
Create pending attempt server-side with tenant/order/amount/currency/reference → initiate provider request → show pending state → receive callback → verify authenticity and replay rules → deduplicate provider event ID → match order, tenant, amount and currency → update payment/order transactionally → reconcile missing, delayed, unmatched, or inconsistent events.

A browser redirect is never proof of payment. A timeout is unknown/pending until confirmed, not automatically failed. Do not trust client-supplied amount or phone as proof. Use HTTPS, rate limits, audit, safe logs, and server-only secrets. Refund availability and fees vary; never claim a refund succeeded until provider result confirms it.

## Release checklist
Test sandbox success, failure, timeout, invalid callback, duplicate callback, wrong amount/currency, unknown order, late callback after reservation expiry, provider outage, credential rotation, missing callback reconciliation, and refunds if supported.