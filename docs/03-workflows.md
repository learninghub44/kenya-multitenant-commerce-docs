# Core Workflows

## Merchant onboarding
Sign up and verify contact → create business workspace → choose unique slug → add store profile and delivery details → preview subdomain storefront → add first product → publish → connect provider in sandbox → test a full order before enabling live payments.

## Product publishing
Draft → validate title, slug, price, images and stock policy → preview → publish. Unpublishing removes a product from public browsing but preserves order history and stock records. Archiving blocks new purchases without deleting historical references.

## Stock receiving
Create purchase order when applicable → record actual received quantities → validate differences/damage → post receipt → create stock movement records and update balances in one transaction → audit action.

## Checkout
Browse published items → select variant and quantity → server recalculates price and checks stock → create pending order and reservation according to policy → initiate payment → await verified provider event → confirm payment once → fulfil. Release expired/failed reservations safely.

## Fulfilment
Paid/approved → picking → packed → dispatched or ready for pickup → delivered/collected. Record actor, timestamps, delivery method, and tracking reference. Fulfilment status is separate from payment status.

## Cancellation and returns
Check current state and permissions → determine stock/reservation/shipping status → record reversals or return disposition → create refund request if appropriate → wait for provider result → notify customer. Cancellation does not itself prove a refund occurred.

## Reconciliation
Verify event authenticity → deduplicate provider event ID → match tenant, order, amount, currency and reference → store event → update state transactionally → flag unmatched/mismatched events for review.