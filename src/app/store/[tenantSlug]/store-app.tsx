"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { accountUrl, authUrl } from "@/lib/store-url";
import { telHref, whatsappHref } from "@/lib/contact-links";
import { formatMoney, orderStatusLabel, type BuyerOrder } from "@/lib/order-labels";
import { localKenyanPhone, normalizeKenyanPhone } from "@/lib/auth-helpers";
import BuyerProfileForm from "@/components/buyer-profile-form";
import type { PublicStoreProfile } from "./store-about";
import {
  BackIcon, BagIcon, CartIcon, ChevronIcon, CloseIcon, GridIcon, HeartIcon, HomeIcon, MinusIcon,
  PhoneIcon, PlusIcon, SearchIcon, TrashIcon, UserIcon, WhatsappIcon,
} from "./store-icons";
import s from "./store-app.module.css";
import { errorMessage } from "@/lib/errors";

export type StoreVariant = {
  variant_id: string; variant_title: string; price_minor: number; currency: string; available_quantity: number | null;
};
export type StoreProduct = {
  product_id: string; product_title: string; product_description: string; category_name: string | null;
  images: { url: string; alt: string; position: number }[]; variants: StoreVariant[];
};
export type StoreBuyer = { email: string | null; name: string; phone: string; address: string } | null;

type View = "home" | "categories" | "wishlist" | "account" | "cart" | "checkout" | "done";
const VIEWS: View[] = ["home", "categories", "wishlist", "account", "cart", "checkout", "done"];
type CreatedOrder = { order_id: string; order_number: string; total_minor: number; currency: string };

function Thumb({ product, sizes = "200px", priority = false }: { product: StoreProduct; sizes?: string; priority?: boolean }) {
  const image = [...product.images].sort((a, b) => a.position - b.position)[0];
  return image
    ? <Image src={image.url} alt={image.alt || product.product_title} fill sizes={sizes} priority={priority} unoptimized className={s.cover} />
    : <span className={s.noImage} aria-hidden="true">{product.product_title.charAt(0).toLocaleUpperCase()}</span>;
}

// crypto.randomUUID only exists in secure contexts (HTTPS or localhost), so fall back safely.
function newCheckoutKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function fromPrice(product: StoreProduct): { label: string; currency: string } {
  const prices = product.variants.map(v => v.price_minor);
  const min = Math.min(...prices);
  const currency = product.variants[0]?.currency ?? "KES";
  return { label: `${prices.length > 1 && Math.max(...prices) !== min ? "From " : ""}${formatMoney(min, currency)}`, currency };
}
const inStock = (v: StoreVariant) => v.available_quantity === null || v.available_quantity > 0;

export default function StoreApp({ storeSlug, profile, products, bestSellerIds, buyer, initialWishlist, aboutSlot }: {
  storeSlug: string; profile: PublicStoreProfile; products: StoreProduct[]; bestSellerIds: string[];
  buyer: StoreBuyer; initialWishlist: string[]; aboutSlot: ReactNode;
}) {
  const storeName = profile.store_name;
  const [view, setView] = useState<View>("home");
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<StoreProduct | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartReady, setCartReady] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set(initialWishlist));
  const [toast, setToast] = useState("");
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [here, setHere] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const byVariant = useMemo(() => {
    const map = new Map<string, { product: StoreProduct; variant: StoreVariant }>();
    for (const product of products) for (const variant of product.variants) map.set(variant.variant_id, { product, variant });
    return map;
  }, [products]);
  const categories = useMemo(() => {
    const map = new Map<string, { name: string; count: number; sample: StoreProduct }>();
    for (const product of products) {
      const name = product.category_name?.trim();
      if (!name) continue;
      const entry = map.get(name);
      if (entry) entry.count += 1; else map.set(name, { name, count: 1, sample: product });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);
  const bestSellers = useMemo(() => bestSellerIds.map(id => products.find(p => p.product_id === id)).filter((p): p is StoreProduct => Boolean(p)), [bestSellerIds, products]);
  const bestSet = useMemo(() => new Set(bestSellerIds), [bestSellerIds]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  // Cart persistence (per store, in this browser only; prices are always re-checked by the database).
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(`cart:${storeSlug}`) ?? "{}") as Record<string, number>;
      const clean: Record<string, number> = {};
      for (const [id, qty] of Object.entries(stored)) {
        const entry = byVariant.get(id);
        if (!entry || !Number.isInteger(qty) || qty < 1) continue;
        const max = entry.variant.available_quantity;
        clean[id] = max === null ? Math.min(qty, 1000) : Math.min(qty, max);
        if (clean[id] < 1) delete clean[id];
      }
      setCart(clean);
    } catch { /* ignore corrupted storage */ }
    setCartReady(true);
  }, [storeSlug, byVariant]);
  useEffect(() => {
    if (!cartReady) return;
    try { localStorage.setItem(`cart:${storeSlug}`, JSON.stringify(cart)); } catch { /* storage unavailable */ }
  }, [cart, cartReady, storeSlug]);

  useEffect(() => { setHere(window.location.origin + window.location.pathname); }, []);

  // Simple hash navigation so the back button works inside the shop.
  useEffect(() => {
    const read = () => {
      const hash = window.location.hash.replace("#", "") as View;
      setView(VIEWS.includes(hash) && hash !== "done" ? hash : "home");
      setOpen(null);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  const go = useCallback((next: View, nextCategory: string | null = null) => {
    setView(next); setCategory(nextCategory); setOpen(null);
    setQuery("");
    window.history.pushState(null, "", next === "home" ? window.location.pathname + window.location.search : `#${next}`);
    window.scrollTo({ top: 0 });
  }, []);

  const cartLines = Object.entries(cart).flatMap(([id, quantity]) => {
    const entry = byVariant.get(id);
    return entry ? [{ ...entry, quantity }] : [];
  });
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cartLines.reduce((sum, line) => sum + line.variant.price_minor * line.quantity, 0);
  const currency = cartLines[0]?.variant.currency ?? "KES";

  function addToCart(variantId: string, quantity = 1) {
    const entry = byVariant.get(variantId);
    if (!entry) return;
    const next = (cart[variantId] ?? 0) + quantity;
    const max = entry.variant.available_quantity;
    if (max !== null && next > max) { showToast(max === 0 ? "Sorry, this item is out of stock." : `Only ${max} available.`); return; }
    setCart({ ...cart, [variantId]: next });
    showToast("Added to cart");
  }
  function setQuantity(variantId: string, quantity: number) {
    const entry = byVariant.get(variantId);
    if (!entry) return;
    const max = entry.variant.available_quantity;
    if (max !== null && quantity > max) { showToast(`Only ${max} available.`); return; }
    const next = { ...cart };
    if (quantity < 1) delete next[variantId]; else next[variantId] = quantity;
    setCart(next);
  }
  async function toggleHeart(productId: string) {
    if (!buyer) { showToast("Sign in to save favourites"); go("account"); return; }
    const had = wishlist.has(productId);
    const optimistic = new Set(wishlist);
    if (had) optimistic.delete(productId); else optimistic.add(productId);
    setWishlist(optimistic);
    try {
      const { error } = await createSupabaseBrowserClient().rpc("toggle_wishlist", { p_store_slug: storeSlug, p_product_id: productId });
      if (error) throw error;
      showToast(had ? "Removed from favourites" : "Saved to favourites");
    } catch (cause) {
      setWishlist(wishlist);
      showToast(errorMessage(cause, "Could not update favourites"));
    }
  }
  function quickAdd(product: StoreProduct) {
    const available = product.variants.filter(inStock);
    if (product.variants.length === 1 && available.length === 1) addToCart(available[0].variant_id);
    else setOpen(product);
  }

  const q = query.trim().toLocaleLowerCase();
  const filtered = products.filter(p => (!category || p.category_name === category) &&
    (!q || `${p.product_title} ${p.product_description} ${p.category_name ?? ""}`.toLocaleLowerCase().includes(q)));
  const searching = q.length > 0 && (view === "home" || view === "categories");


  function renderCard(product: StoreProduct) {
    const price = fromPrice(product);
    const soldOut = product.variants.every(v => !inStock(v));
    return (
      <article className={s.card} key={product.product_id}>
        <button type="button" className={s.cardImage} onClick={() => setOpen(product)} aria-label={`View ${product.product_title}`}>
          <Thumb product={product} />
          {bestSet.has(product.product_id) && <span className={s.badge}>Best seller</span>}
          {soldOut && <span className={`${s.badge} ${s.badgeMuted}`}>Sold out</span>}
        </button>
        <button type="button" className={`${s.heart} ${wishlist.has(product.product_id) ? s.heartOn : ""}`} aria-pressed={wishlist.has(product.product_id)} aria-label={wishlist.has(product.product_id) ? `Remove ${product.product_title} from favourites` : `Save ${product.product_title} to favourites`} onClick={() => toggleHeart(product.product_id)}>
          <HeartIcon size={20} filled={wishlist.has(product.product_id)} />
        </button>
        <div className={s.cardBody}>
          <h3 onClick={() => setOpen(product)}>{product.product_title}</h3>
          <div className={s.cardFoot}>
            <strong>{price.label}</strong>
            <button type="button" className={s.addRound} disabled={soldOut} onClick={() => quickAdd(product)} aria-label={`Add ${product.product_title} to cart`}><CartIcon size={18} /></button>
          </div>
        </div>
      </article>
    );
  }

  const searchBar = (
    <label className={s.search}>
      <SearchIcon />
      <span className="sr-only">Search products</span>
      <input type="search" placeholder="Search products…" value={query} onChange={e => { setQuery(e.target.value); if (view !== "home" && view !== "categories") go("home"); }} />
      {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><CloseIcon size={18} /></button>}
    </label>
  );

  const headerTitle: Record<View, string> = { home: storeName, categories: category ?? "Categories", wishlist: "Favourites", account: "My account", cart: "Cart", checkout: "Checkout", done: "Order received" };
  const subPage = view !== "home" && view !== "categories" || (view === "categories" && category !== null);

  return (
    <div className={s.app}>
      <header className={s.header}>
        {subPage ? (
          <button type="button" className={s.iconButton} onClick={() => (view === "checkout" ? go("cart") : view === "categories" ? go("categories") : go("home"))} aria-label="Back"><BackIcon /></button>
        ) : (
          <a className={s.brand} href="#" onClick={e => { e.preventDefault(); go("home"); }} aria-label={`${storeName} home`}>
            {profile.logo_url
              ? <span className={s.logo}><Image src={profile.logo_url} alt="" fill sizes="44px" unoptimized className={s.cover} /></span>
              : <span className={s.logoMark} aria-hidden="true">{storeName.charAt(0).toLocaleUpperCase()}</span>}
            <span className={s.brandText}><strong>{storeName}</strong>{profile.tagline && <small>{profile.tagline}</small>}</span>
          </a>
        )}
        {subPage && <h1 className={s.pageTitle}>{headerTitle[view]}</h1>}
        <nav className={s.deskNav} aria-label="Shop sections">
          {([["home", "Home"], ["categories", "Categories"], ["wishlist", "Favourites"], ["account", "Account"]] as const).map(([id, label]) => (
            <button key={id} type="button" className={view === id ? s.deskActive : ""} onClick={() => go(id)}>{label}</button>
          ))}
        </nav>
        <div className={s.headerActions}>
          {profile.phone && <a className={s.iconButton} href={telHref(profile.phone)} aria-label={`Call ${storeName}`}><PhoneIcon /></a>}
          <button type="button" className={s.iconButton} onClick={() => go("cart")} aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}>
            <CartIcon />{cartCount > 0 && <span className={s.cartBadge}>{cartCount}</span>}
          </button>
        </div>
      </header>

      <main className={s.main} id="shop">
        {(view === "home" || (view === "categories" && category === null) || searching) && searchBar}

        {searching && (
          <section aria-label="Search results">
            <h2 className={s.sectionTitle}>{filtered.length} result{filtered.length === 1 ? "" : "s"} for “{query.trim()}”</h2>
            {filtered.length ? <div className={s.grid}>{filtered.map(p => renderCard(p))}</div> : <p className={s.empty}>Nothing matches your search. Try another word.</p>}
          </section>
        )}

        {!searching && view === "home" && (
          <>
            <section className={`${s.hero} ${profile.banner_url ? s.heroBanner : ""}`}>
              {profile.banner_url && <Image src={profile.banner_url} alt="" fill sizes="100vw" priority unoptimized className={s.cover} />}
              <div className={s.heroCopy}>
                <h2>{profile.tagline || `Welcome to ${storeName}`}</h2>
                <p>{profile.about ? (profile.about.length > 110 ? `${profile.about.slice(0, 110).trimEnd()}…` : profile.about) : "Browse the collection and order in a few taps."}</p>
                <button type="button" className={s.heroButton} onClick={() => document.getElementById("all-products")?.scrollIntoView({ behavior: "smooth" })}>Shop now <ChevronIcon size={16} /></button>
              </div>
            </section>

            {categories.length > 0 && (
              <section aria-label="Shop by category">
                <div className={s.chipRow}>
                  {categories.slice(0, 4).map(cat => (
                    <button key={cat.name} type="button" className={s.catTile} onClick={() => go("categories", cat.name)}>
                      <span className={s.catThumb}><Thumb product={cat.sample} sizes="72px" /></span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                  {categories.length > 4 && (
                    <button type="button" className={s.catTile} onClick={() => go("categories")}>
                      <span className={`${s.catThumb} ${s.catMore}`}><GridIcon /></span><span>All categories</span>
                    </button>
                  )}
                </div>
              </section>
            )}

            {bestSellers.length > 0 && (
              <section aria-labelledby="best-heading">
                <div className={s.sectionHead}><h2 id="best-heading">Best sellers</h2></div>
                <div className={s.scroller}>{bestSellers.map(p => <div className={s.scrollItem} key={p.product_id}>{renderCard(p)}</div>)}</div>
              </section>
            )}

            <section id="all-products" aria-labelledby="all-heading">
              <div className={s.sectionHead}><h2 id="all-heading">{bestSellers.length ? "All products" : "Our products"}</h2><span>{products.length} item{products.length === 1 ? "" : "s"}</span></div>
              {products.length ? <div className={s.grid}>{products.map(p => renderCard(p))}</div> : (
                <div className={s.emptyBox}><BagIcon size={36} /><h3>Products are coming soon</h3><p>{storeName} is getting ready. Message the shop to ask what is available.</p></div>
              )}
            </section>
            <div className={s.about}>{aboutSlot}</div>
          </>
        )}

        {!searching && view === "categories" && category === null && (
          <section aria-label="Categories">
            {categories.length ? (
              <div className={s.catGrid}>
                {categories.map(cat => (
                  <button key={cat.name} type="button" className={s.catCard} onClick={() => go("categories", cat.name)}>
                    <span className={s.catCardImage}><Thumb product={cat.sample} sizes="240px" /></span>
                    <span className={s.catCardLabel}><span>{cat.name}<small>{cat.count} item{cat.count === 1 ? "" : "s"}</small></span><ChevronIcon /></span>
                  </button>
                ))}
              </div>
            ) : <p className={s.empty}>This shop has not set up categories yet. <button type="button" className={s.linkButton} onClick={() => go("home")}>Browse all products</button></p>}
          </section>
        )}
        {!searching && view === "categories" && category !== null && (
          <section aria-label={category}>
            <div className={s.sectionHead}><h2>{category}</h2><span>{filtered.length} item{filtered.length === 1 ? "" : "s"}</span></div>
            <div className={s.grid}>{filtered.map(p => renderCard(p))}</div>
          </section>
        )}

        {view === "wishlist" && (
          <section aria-label="Favourites">
            {!buyer ? (
              <div className={s.emptyBox}><HeartIcon size={36} /><h3>Save the things you love</h3><p>Create a free account to keep a favourites list at {storeName}.</p>
                <div className={s.stack}><a className={s.primary} href={authUrl("register", here)}>Create free account</a><a className={s.ghost} href={authUrl("login", here)}>Sign in</a></div></div>
            ) : (() => {
              const saved = products.filter(p => wishlist.has(p.product_id));
              return saved.length ? <div className={s.grid}>{saved.map(p => renderCard(p))}</div>
                : <div className={s.emptyBox}><HeartIcon size={36} /><h3>No favourites yet</h3><p>Tap the heart on any product to save it here.</p><button type="button" className={s.primary} onClick={() => go("home")}>Browse products</button></div>;
            })()}
          </section>
        )}

        {view === "cart" && (
          <section aria-label="Your cart">
            {cartLines.length === 0 ? (
              <div className={s.emptyBox}><CartIcon size={36} /><h3>Your cart is empty</h3><p>Add something you like and it will show up here.</p><button type="button" className={s.primary} onClick={() => go("home")}>Start shopping</button></div>
            ) : (
              <>
                <ul className={s.lines}>
                  {cartLines.map(line => (
                    <li key={line.variant.variant_id} className={s.line}>
                      <span className={s.lineImage}><Thumb product={line.product} sizes="96px" /></span>
                      <div className={s.lineInfo}>
                        <strong>{line.product.product_title}</strong>
                        {line.variant.variant_title && line.variant.variant_title.toLowerCase() !== "default" && <small>{line.variant.variant_title}</small>}
                        <b>{formatMoney(line.variant.price_minor, line.variant.currency)}</b>
                        <div className={s.stepper}>
                          <button type="button" onClick={() => setQuantity(line.variant.variant_id, line.quantity - 1)} aria-label="Decrease quantity"><MinusIcon /></button>
                          <span aria-live="polite">{line.quantity}</span>
                          <button type="button" onClick={() => setQuantity(line.variant.variant_id, line.quantity + 1)} aria-label="Increase quantity"><PlusIcon /></button>
                        </div>
                      </div>
                      <button type="button" className={s.remove} onClick={() => setQuantity(line.variant.variant_id, 0)} aria-label={`Remove ${line.product.product_title}`}><TrashIcon /></button>
                    </li>
                  ))}
                </ul>
                <div className={s.summary}>
                  <div><span>Subtotal</span><span>{formatMoney(subtotal, currency)}</span></div>
                  <div><span>Delivery</span><span>Agreed with the shop</span></div>
                  <div className={s.total}><span>Total</span><strong>{formatMoney(subtotal, currency)}</strong></div>
                </div>
                <button type="button" className={s.primaryWide} onClick={() => go("checkout")}>Proceed to checkout <ChevronIcon /></button>
                <button type="button" className={s.ghostWide} onClick={() => go("home")}>Continue shopping</button>
              </>
            )}
          </section>
        )}

        {view === "checkout" && (
          <Checkout storeSlug={storeSlug} storeName={storeName} lines={cartLines.map(l => ({ id: l.variant.variant_id, title: l.product.product_title, variant: l.variant.variant_title, quantity: l.quantity, price: l.variant.price_minor, currency: l.variant.currency }))}
            subtotal={subtotal} currency={currency} buyer={buyer} loginHref={authUrl("login", here + "#checkout")} registerHref={authUrl("register", here + "#checkout")}
            onDone={created => { setOrder(created); setCart({}); go("done"); }} onEmpty={() => go("cart")} />
        )}

        {view === "done" && order && (
          <section className={s.done} role="status">
            <span className={s.doneMark}><BagIcon size={34} /></span>
            <h2>Order received</h2>
            <p>Reference <strong>{order.order_number}</strong></p>
            <p>Total <strong>{formatMoney(order.total_minor, order.currency)}</strong></p>
            <p className={s.muted}>{storeName} will confirm your order and arrange payment and delivery with you. This is not a payment confirmation.</p>
            {profile.whatsapp && <a className={s.whatsappButton} target="_blank" rel="noopener noreferrer" href={`${whatsappHref(profile.whatsapp)}?text=${encodeURIComponent(`Hi ${storeName}, I just placed order ${order.order_number} (${formatMoney(order.total_minor, order.currency)}). Please confirm.`)}`}><WhatsappIcon size={20} /> Message the shop on WhatsApp</a>}
            {buyer ? <button type="button" className={s.ghostWide} onClick={() => go("account")}>View my orders</button>
              : <a className={s.ghostWide} href={authUrl("register", here + "#account")}>Create an account to track orders</a>}
            <button type="button" className={s.primaryWide} onClick={() => go("home")}>Continue shopping</button>
          </section>
        )}
        {view === "done" && !order && <div className={s.emptyBox}><h3>Nothing to show</h3><button type="button" className={s.primary} onClick={() => go("home")}>Back to shop</button></div>}

        {view === "account" && <Account storeSlug={storeSlug} storeName={storeName} profile={profile} buyer={buyer} pageUrl={here} />}
      </main>

      {profile.whatsapp && view !== "checkout" && (
        <a className={s.fab} target="_blank" rel="noopener noreferrer" aria-label={`Chat with ${storeName} on WhatsApp`} href={`${whatsappHref(profile.whatsapp)}?text=${encodeURIComponent(`Hi ${storeName}, I have a question about your shop.`)}`}><WhatsappIcon size={28} /></a>
      )}

      <nav className={s.tabbar} aria-label="Shop sections">
        {([["home", "Home", HomeIcon], ["categories", "Categories", GridIcon], ["wishlist", "Favourites", HeartIcon], ["account", "Account", UserIcon]] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" className={view === id ? s.tabOn : ""} aria-current={view === id ? "page" : undefined} onClick={() => go(id)}>
            <Icon size={24} /><span>{label}</span>
          </button>
        ))}
      </nav>

      {open && <ProductSheet key={open.product_id} product={open} storeName={storeName} whatsapp={profile.whatsapp} liked={wishlist.has(open.product_id)}
        onClose={() => setOpen(null)} onHeart={() => toggleHeart(open.product_id)} onAdd={(variantId, qty) => { addToCart(variantId, qty); setOpen(null); }} />}

      <div className={s.toast} role="status" aria-live="polite">{toast && <span>{toast}</span>}</div>
    </div>
  );
}

function ProductSheet({ product, storeName, whatsapp, liked, onClose, onHeart, onAdd }: {
  product: StoreProduct; storeName: string; whatsapp: string | null; liked: boolean;
  onClose: () => void; onHeart: () => void; onAdd: (variantId: string, quantity: number) => void;
}) {
  const images = [...product.images].sort((a, b) => a.position - b.position);
  const firstAvailable = product.variants.find(inStock) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.variant_id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const variant = product.variants.find(v => v.variant_id === variantId) ?? firstAvailable;
  const max = variant?.available_quantity ?? 1000;
  const soldOut = !variant || !inStock(variant);

  useEffect(() => {
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label={product.product_title} onClick={e => e.stopPropagation()}>
        <button ref={closeRef} type="button" className={s.sheetClose} onClick={onClose} aria-label="Close"><CloseIcon /></button>
        <div className={s.gallery}>
          <div className={s.galleryMain}>
            {images[imageIndex] ? <Image src={images[imageIndex].url} alt={images[imageIndex].alt || product.product_title} fill sizes="(max-width: 700px) 100vw, 420px" unoptimized className={s.contain} /> : <span className={s.noImage} aria-hidden="true">{product.product_title.charAt(0).toLocaleUpperCase()}</span>}
          </div>
          {images.length > 1 && <div className={s.thumbs}>{images.map((img, i) => (
            <button key={img.url} type="button" className={i === imageIndex ? s.thumbOn : ""} onClick={() => setImageIndex(i)} aria-label={`Show image ${i + 1}`}><Image src={img.url} alt="" fill sizes="56px" unoptimized className={s.cover} /></button>
          ))}</div>}
        </div>
        <div className={s.sheetInfo}>
          {product.category_name && <p className={s.sheetCat}>{product.category_name}</p>}
          <h2>{product.product_title}</h2>
          <p className={s.sheetPrice}>{variant ? formatMoney(variant.price_minor, variant.currency) : ""}</p>
          {product.product_description && <p className={s.sheetDesc}>{product.product_description}</p>}
          {product.variants.length > 1 && (
            <fieldset className={s.variants}><legend>Choose an option</legend>
              {product.variants.map(v => (
                <button key={v.variant_id} type="button" disabled={!inStock(v)} aria-pressed={v.variant_id === variantId} className={v.variant_id === variantId ? s.variantOn : ""} onClick={() => { setVariantId(v.variant_id); setQuantity(1); }}>
                  {v.variant_title}<small>{formatMoney(v.price_minor, v.currency)}</small>
                </button>
              ))}
            </fieldset>
          )}
          <p className={soldOut ? s.stockOut : s.stockIn}>{soldOut ? "Out of stock" : variant?.available_quantity === null || variant?.available_quantity === undefined ? "In stock" : variant.available_quantity <= 5 ? `Only ${variant.available_quantity} left` : "In stock"}</p>
          <div className={s.sheetActions}>
            <div className={s.stepper}>
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity"><MinusIcon /></button>
              <span aria-live="polite">{quantity}</span>
              <button type="button" onClick={() => setQuantity(Math.min(max, quantity + 1))} aria-label="Increase quantity"><PlusIcon /></button>
            </div>
            <button type="button" className={s.primaryWide} disabled={soldOut} onClick={() => variant && onAdd(variant.variant_id, quantity)}>Add to cart</button>
            <button type="button" className={`${s.heartSheet} ${liked ? s.heartOn : ""}`} aria-pressed={liked} aria-label={liked ? "Remove from favourites" : "Save to favourites"} onClick={onHeart}><HeartIcon filled={liked} /></button>
          </div>
          {whatsapp && <a className={s.askLink} target="_blank" rel="noopener noreferrer" href={`${whatsappHref(whatsapp)}?text=${encodeURIComponent(`Hi ${storeName}, I am interested in "${product.product_title}". Is it available?`)}`}><WhatsappIcon size={18} /> Ask about this product</a>}
        </div>
      </div>
    </div>
  );
}

function Checkout({ storeSlug, storeName, lines, subtotal, currency, buyer, loginHref, registerHref, onDone, onEmpty }: {
  storeSlug: string; storeName: string; subtotal: number; currency: string; buyer: StoreBuyer; loginHref: string; registerHref: string;
  lines: { id: string; title: string; variant: string; quantity: number; price: number; currency: string }[];
  onDone: (order: CreatedOrder) => void; onEmpty: () => void;
}) {
  const [name, setName] = useState(buyer?.name ?? "");
  const [phone, setPhone] = useState(buyer?.phone ? localKenyanPhone(buyer.phone) : "");
  const [address, setAddress] = useState(buyer?.address ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const keyRef = useRef("");

  if (lines.length === 0) return <div className={s.emptyBox}><h3>Your cart is empty</h3><button type="button" className={s.primary} onClick={onEmpty}>Back to cart</button></div>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      if (name.trim().length < 2) throw new Error("Enter your name.");
      const normalized = normalizeKenyanPhone(phone);
      if (!normalized) throw new Error("Enter a Kenyan phone number like 712 345 678.");
      keyRef.current ||= newCheckoutKey();
      const { data, error: rpcError } = await createSupabaseBrowserClient().rpc("create_public_order", {
        p_store_slug: storeSlug,
        p_items: lines.map(line => ({ variant_id: line.id, quantity: line.quantity })),
        p_customer_name: name.trim(), p_customer_phone: normalized, p_delivery_address: address.trim(), p_idempotency_key: keyRef.current,
      });
      if (rpcError) throw rpcError;
      const created = Array.isArray(data) ? (data[0] as CreatedOrder | undefined) : undefined;
      if (!created?.order_number) throw new Error("The order response was incomplete. Please try again.");
      keyRef.current = "";
      onDone(created);
    } catch (cause) {
      setError(errorMessage(cause, "Could not place this order. Please try again."));
    } finally { setBusy(false); }
  }

  return (
    <section aria-label="Checkout">
      {!buyer && <p className={s.signinNote}>Have an account? <a href={loginHref}>Sign in</a> for faster checkout and order history, or <a href={registerHref}>create one free</a>. You can also continue as a guest.</p>}
      <form className={s.form} onSubmit={submit}>
        <h2>Your details</h2>
        <label htmlFor="co-name">Full name</label>
        <input id="co-name" required minLength={2} maxLength={180} autoComplete="name" value={name} onChange={e => { setName(e.target.value); keyRef.current = ""; }} />
        <label htmlFor="co-phone">Phone number</label>
        <div className={s.phoneField}><span aria-hidden="true">+254</span><input id="co-phone" type="tel" inputMode="tel" required maxLength={20} autoComplete="tel-national" placeholder="712 345 678" value={phone} onChange={e => { setPhone(e.target.value); keyRef.current = ""; }} /></div>
        <label htmlFor="co-address">Delivery address <span className={s.muted}>(optional)</span></label>
        <textarea id="co-address" rows={3} maxLength={2000} autoComplete="street-address" value={address} onChange={e => { setAddress(e.target.value); keyRef.current = ""; }} />
        <div className={s.summary}>
          {lines.map(line => <div key={line.id}><span>{line.quantity} × {line.title}{line.variant && line.variant.toLowerCase() !== "default" ? ` (${line.variant})` : ""}</span><span>{formatMoney(line.price * line.quantity, line.currency)}</span></div>)}
          <div className={s.total}><span>Total</span><strong>{formatMoney(subtotal, currency)}</strong></div>
        </div>
        <p className={s.muted}>Pay {storeName} directly when they confirm your order. No online payment is taken here. Prices and stock are checked again when you place the order.</p>
        {error && <p className="form-message error" role="alert">{error}</p>}
        <button className={s.primaryWide} type="submit" disabled={busy}>{busy ? "Placing order…" : "Place order"}</button>
      </form>
    </section>
  );
}

function Account({ storeSlug, storeName, profile, buyer, pageUrl }: { storeSlug: string; storeName: string; profile: PublicStoreProfile; buyer: StoreBuyer; pageUrl: string }) {
  const [orders, setOrders] = useState<BuyerOrder[] | null>(null);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    if (!buyer) return;
    let alive = true;
    (async () => {
      try {
        const { data, error } = await createSupabaseBrowserClient().rpc("get_my_orders");
        if (error) throw error;
        if (alive) setOrders(((data ?? []) as BuyerOrder[]).filter(order => order.store_slug === storeSlug));
      } catch {
        if (alive) setOrdersError("Could not load your orders. Please try again.");
      }
    })();
    return () => { alive = false; };
  }, [buyer, storeSlug]);

  async function signOut() {
    try { await createSupabaseBrowserClient().auth.signOut(); } finally { window.location.reload(); }
  }

  if (!buyer) {
    return (
      <section className={s.emptyBox} aria-label="Account">
        <UserIcon size={36} /><h3>Shop faster with an account</h3>
        <p>Save your details, keep favourites and see all your orders from {storeName} and other shops in one place.</p>
        <div className={s.stack}><a className={s.primary} href={authUrl("register", pageUrl + "#account")}>Create free account</a><a className={s.ghost} href={authUrl("login", pageUrl + "#account")}>Sign in</a></div>
      </section>
    );
  }
  return (
    <section aria-label="Account" className={s.accountWrap}>
      <div className={s.profileCard}><span className={s.avatar}>{(buyer.name || buyer.email || "?").charAt(0).toLocaleUpperCase()}</span><div><strong>{buyer.name || "Welcome"}</strong><small>{buyer.email}</small></div></div>
      <h2 className={s.sectionTitle}>My orders at {storeName}</h2>
      {ordersError && <p className="form-message error" role="alert">{ordersError}</p>}
      {orders === null && !ordersError && <p className={s.muted}>Loading your orders…</p>}
      {orders?.length === 0 && <p className={s.empty}>No orders here yet. When you place one it will show up in this list.</p>}
      <ul className={s.orders}>
        {orders?.map(order => (
          <li key={order.order_id} className={s.orderCard}>
            <div className={s.orderTop}><strong>{order.order_number}</strong><span className={`${s.pill} ${s[`pill_${order.status}`] ?? ""}`}>{orderStatusLabel(order.status)}</span></div>
            <p className={s.muted}>{new Date(order.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })} · {formatMoney(order.total_minor, order.currency)}</p>
            <ul className={s.orderItems}>{order.items.map((item, i) => <li key={i}>{item.quantity} × {item.title}{item.variant && item.variant.toLowerCase() !== "default" ? ` (${item.variant})` : ""}</li>)}</ul>
            {profile.whatsapp && <a className={s.askLink} target="_blank" rel="noopener noreferrer" href={`${whatsappHref(profile.whatsapp)}?text=${encodeURIComponent(`Hi ${storeName}, about my order ${order.order_number}.`)}`}><WhatsappIcon size={18} /> Message the shop about this order</a>}
          </li>
        ))}
      </ul>
      <h2 className={s.sectionTitle}>My details</h2>
      <BuyerProfileForm initial={{ name: buyer.name, phone: buyer.phone, address: buyer.address }} />
      <button type="button" className={s.ghostWide} onClick={signOut}>Sign out</button>
      <a className={s.linkCenter} href={accountUrl()}>See orders from all shops</a>
    </section>
  );
}
