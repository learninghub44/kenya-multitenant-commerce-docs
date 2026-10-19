# Buyer accounts, storefront and order history

One shared database serves every store. Stores are separated by `tenant_id` and row-level security, not by separate databases or branches (Supabase branches are for preview/staging, are paid, and do not scale to one per store).

## What buyers can do
- Browse a store as a guest, add to cart and check out (guest checkout still works).
- Create a free account (Google, email + password, or email link) to save name, phone and address, keep a favourites list, and see order history.
- The account is global: one sign-in works on every store. `/account` on the root domain lists orders from all stores; each store's Account tab lists orders for that store.

## Data model (migration `202610180001_buyer_accounts.sql`)
- `buyer_profiles` (own row only), written by `save_buyer_profile`.
- `orders.buyer_user_id` is set from `auth.uid()` inside `create_public_order`; never from the browser. A `customers` row is created or updated per store and buyer, so sellers see their buyers in business records.
- `wishlist_items`, changed only through `toggle_wishlist`; read through `get_my_wishlist_ids`.
- `get_my_orders()` returns the signed-in buyer's orders with store contact details.
- `get_public_best_sellers()` powers the Best seller badges (non-cancelled orders, last 90 days).

## Shared sign-in across store subdomains
When `NEXT_PUBLIC_APP_URL` is a real domain, auth cookies use the root domain (`.example.co.ke`) so a buyer who signs in at `example.co.ke/login` is signed in on `shop.example.co.ke` too. Sign-in pages always live on the root domain; after signing in the buyer is sent back to the store they came from (only the app's own subdomains are accepted as return addresses). Because cookies are shared, store pages must never run seller-supplied scripts. All store content is rendered as plain text by React.

Existing sessions on the old host-only cookie need to sign in once after this change.
