"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type CheckoutVariant = {
  variant_id: string; variant_title: string; price_minor: number; currency: string;
  available_quantity: number | null;
};
type CheckoutProduct = { product_id: string; product_title: string; variants: CheckoutVariant[] };
type CartLine = { variant: CheckoutVariant; productTitle: string; quantity: number };
type CreatedOrder = { order_id: string; order_number: string; total_minor: number; currency: string };

export default function PublicCheckout({ storeSlug, products }: { storeSlug: string; products: CheckoutProduct[] }) {
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  function resetKey() { setIdempotencyKey(""); }
  function add(product: CheckoutProduct, variant: CheckoutVariant) {
    const previous = cart[variant.variant_id];
    const nextQuantity = (previous?.quantity ?? 0) + 1;
    if (variant.available_quantity !== null && nextQuantity > variant.available_quantity) {
      setError("The requested quantity is above the available stock.");
      return;
    }
    setError(""); setOrder(null); resetKey();
    setCart({ ...cart, [variant.variant_id]: { variant, productTitle: product.product_title, quantity: nextQuantity } });
  }
  function changeQuantity(variantId: string, quantity: number) {
    const next = { ...cart };
    const line = next[variantId];
    if (!line) return;
    if (quantity > 0 && line.variant.available_quantity !== null && quantity > line.variant.available_quantity) {
      setError("The requested quantity is above the available stock.");
      return;
    }
    if (quantity < 1) delete next[variantId];
    else next[variantId] = { ...line, quantity };
    setError(""); setOrder(null); resetKey();
    setCart(next);
  }

  const lines = Object.values(cart);
  const estimatedTotal = lines.reduce((sum, line) => sum + line.variant.price_minor * line.quantity, 0);

  async function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setOrder(null);
    try {
      if (lines.length === 0) throw new Error("Add at least one product to your order.");
      if (name.trim().length < 2) throw new Error("Enter your name.");
      if (phone.trim().length < 7) throw new Error("Enter a valid contact phone number.");
      const key = idempotencyKey || crypto.randomUUID();
      setIdempotencyKey(key);
      const supabase = createSupabaseBrowserClient();
      const { data, error: rpcError } = await supabase.rpc("create_public_order", {
        p_store_slug: storeSlug,
        p_items: lines.map(line => ({ variant_id: line.variant.variant_id, quantity: line.quantity })),
        p_customer_name: name.trim(),
        p_customer_phone: phone.trim(),
        p_delivery_address: address.trim(),
        p_idempotency_key: key
      });
      if (rpcError) throw rpcError;
      const created = Array.isArray(data) ? data[0] as CreatedOrder | undefined : undefined;
      if (!created?.order_number) throw new Error("The order response was incomplete. Retry with the same details.");
      setOrder(created); setCart({}); setIdempotencyKey("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not place this order. Retry without changing the details.");
    } finally { setBusy(false); }
  }

  return <section className="public-checkout" aria-label="Order request">
    <header><p className="eyebrow">ORDER REQUEST</p><h2>Ready to order?</h2><p>Submit your order request. Online payment is not enabled yet; the store will need to confirm payment arrangements with you.</p></header>
    {order ? <div className="order-confirmation" role="status">
      <h3>Order request received</h3><p>Reference: <strong>{order.order_number}</strong></p>
      <p>Total: <strong>{new Intl.NumberFormat("en-KE", { style: "currency", currency: order.currency }).format(order.total_minor / 100)}</strong></p>
      <p>Your stock reservation lasts up to 30 minutes. This is not a payment confirmation.</p>
      <button className="secondary-button" type="button" onClick={() => setOrder(null)}>Continue browsing</button>
    </div> : <>
      <div className="checkout-products">
        {products.map(product => <div className="checkout-product" key={product.product_id}>
          <strong>{product.product_title}</strong>
          {product.variants.map(variant => <div className="checkout-variant" key={variant.variant_id}>
            <span>{variant.variant_title} · {new Intl.NumberFormat("en-KE", { style: "currency", currency: variant.currency }).format(variant.price_minor / 100)}
              {variant.available_quantity !== null && <small>{variant.available_quantity} available</small>}
            </span>
            <button type="button" className="secondary-button" disabled={variant.available_quantity === 0} onClick={() => add(product, variant)}>Add</button>
          </div>)}
        </div>)}
      </div>
      <form className="product-form" onSubmit={placeOrder}>
        <h3>Your order</h3>
        {lines.length === 0 ? <p className="auth-description">Your order is empty. Add products above to continue.</p> : <div className="cart-lines">
          {lines.map(line => <div className="cart-line" key={line.variant.variant_id}>
            <span>{line.productTitle}<small>{line.variant.variant_title}</small></span>
            <input aria-label={`Quantity for ${line.productTitle}`} type="number" min="0" max={line.variant.available_quantity ?? 1000} value={line.quantity} onChange={event => changeQuantity(line.variant.variant_id, Number(event.target.value))} />
            <strong>{new Intl.NumberFormat("en-KE", { style: "currency", currency: line.variant.currency }).format(line.variant.price_minor * line.quantity / 100)}</strong>
          </div>)}
          <p className="cart-total">Estimated total <strong>{new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(estimatedTotal / 100)}</strong></p>
        </div>}
        <label htmlFor={`checkout-name-${storeSlug}`}>Your name</label>
        <input id={`checkout-name-${storeSlug}`} required minLength={2} maxLength={180} value={name} onChange={event => { setName(event.target.value); resetKey(); }} />
        <label htmlFor={`checkout-phone-${storeSlug}`}>Phone number</label>
        <input id={`checkout-phone-${storeSlug}`} required minLength={7} maxLength={40} value={phone} onChange={event => { setPhone(event.target.value); resetKey(); }} />
        <label htmlFor={`checkout-address-${storeSlug}`}>Delivery address (optional)</label>
        <textarea id={`checkout-address-${storeSlug}`} rows={2} maxLength={2000} value={address} onChange={event => { setAddress(event.target.value); resetKey(); }} />
        {error && <p className="form-message error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={busy || lines.length === 0}>{busy ? "Submitting…" : "Submit order request"}</button>
        <p className="field-help">Prices and stock are rechecked by the database when you submit. No payment is taken on this page.</p>
      </form>
    </>}
  </section>;
}
