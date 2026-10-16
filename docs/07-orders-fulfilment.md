# Orders, Fulfilment, Cancellations, and Returns

Keep payment state and fulfilment state separate. Suggested payment states: pending, processing, paid, failed, cancelled, partially refunded, refunded, review required. Suggested fulfilment states: unfulfilled, processing, packed, dispatched, ready for pickup, delivered, cancelled, returned. Enforce transitions server-side.

Store tenant, order number, customer snapshot, item snapshots, quantity, prices, discounts, delivery, tax where applicable, currency, totals, payment state, fulfilment state, source, notes, and timestamps. Preserve snapshots when catalogue data changes.

Checkout validates published status, variant, quantity limits, server-calculated price/discount, stock, delivery choice, and customer input. Use a unique tenant-scoped order number and idempotency for repeated checkout requests.

Recommended scarce-stock policy: short-lived reservation at checkout; confirm on verified payment; release on expiry/failure. Reservation expiry must not race with a successful callback.

Fulfilment captures picking, packing, dispatch/delivery timestamps, delivery method, tracking reference, and operator. Do not expose internal notes to customers.

Cancellation is not a refund. Record refund request and provider result separately. For shipped items, require return handling before restoring sellable stock. Record damaged/unsellable disposition. Notify customers on order received, payment confirmed, dispatch, pickup readiness, delivery, cancellation, and refund outcome without duplicate notifications.