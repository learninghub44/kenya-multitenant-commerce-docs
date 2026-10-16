# ERP and Inventory Management

## Scope
Reliable stock control first, then purchasing, suppliers, stock locations, expenses, and operational reports. Keep the ERP lightweight; do not imply that basic expense reports are full accounting.

## Core concepts
Product and variant; SKU; stock location; on-hand quantity; reserved quantity; available quantity; reorder point; stock movement; stocktake; purchase order; goods received note (GRN).

## MVP inventory
- Show on-hand, reserved, available, and low-stock status.
- Receive stock and perform manual adjustments with required reasons.
- Show movement history with timestamp, actor, signed quantity, source reference, and reason.
- Reserve stock for checkout and release it on expiry/cancellation.
- Prevent overselling using database transactions/locking.
- Report low-stock and out-of-stock items.

## Ledger rules
1. The stock movement ledger is the audit source of truth.
2. Never let browser code update stock balances directly.
3. Every movement records tenant, variant, location, quantity delta, movement type, reason, source reference, actor/system actor, and timestamp.
4. Insert movement and update derived balance in the same transaction.
5. Use idempotency keys for receiving, adjustments, reservations, releases, and fulfilment.
6. Require reason and permission for manual adjustments; optionally require owner approval for large variance.
7. Transfers create paired outbound/inbound movements and must not create or destroy quantity.
8. Test reservation/payment/expiry races.

## Purchasing phase
Supplier directory → purchase order draft/approval → partial or full receipt → close. A purchase order alone does not change stock. Only a posted receipt changes stock. Capture supplier, order reference, quantities, expected date, unit cost, currency, rejected/damaged goods, and receiver.

## Locations and transfers
Each location has separate balances. Transfer lifecycle: draft → dispatched/in transit → received. Do not count in-transit stock as available at both locations. Reverse posted operations with linked reversal movements, never by deleting history.

## Stocktake
Open a count session for location/SKU scope → record physical counts → calculate variance against a consistent snapshot → review → post adjustment with reason and actor.

## Acceptance
Two simultaneous checkouts cannot sell the final unit. Every balance change has a ledger entry. Failed transactions leave no partial state. Repeated idempotent requests do not double-apply. Tenant A cannot inspect or mutate Tenant B inventory, supplier costs, or stocktakes.