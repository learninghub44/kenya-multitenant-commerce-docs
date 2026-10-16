"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import styles from "./storefront-catalog.module.css";

type StoreVariant = {
  variant_id: string;
  variant_title: string;
  price_minor: number;
  currency: string;
  available_quantity: number | null;
};
export type StoreProduct = {
  product_id: string;
  product_title: string;
  product_description: string;
  category_name: string | null;
  images: { url: string; alt: string; position: number }[];
  variants: StoreVariant[];
};

function money(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

export default function StorefrontCatalog({ storeName, products }: { storeName: string; products: StoreProduct[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All products");
  const [sort, setSort] = useState("featured");

  const categories = useMemo(
    () => ["All products", ...Array.from(new Set(products.map((p) => p.category_name).filter((name): name is string => Boolean(name))))],
    [products],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const result = products.filter((product) => {
      const matchesCategory = category === "All products" || product.category_name === category;
      const matchesQuery = !normalized || [product.product_title, product.product_description, product.category_name ?? ""]
        .some((value) => value.toLocaleLowerCase().includes(normalized));
      return matchesCategory && matchesQuery;
    });
    if (sort === "price-low" || sort === "price-high") {
      result.sort((a, b) => {
        const priceA = Math.min(...a.variants.map((variant) => variant.price_minor));
        const priceB = Math.min(...b.variants.map((variant) => variant.price_minor));
        return sort === "price-low" ? priceA - priceB : priceB - priceA;
      });
    }
    if (sort === "name") result.sort((a, b) => a.product_title.localeCompare(b.product_title));
    return result;
  }, [products, query, category, sort]);

  return (
    <>
      <header className={styles.storeHeader}>
        <a className={styles.brand} href="#top" aria-label={`${storeName} home`}>
          <span className={styles.brandMark} aria-hidden="true">{storeName.trim().charAt(0).toLocaleUpperCase()}</span>
          <span className={styles.brandName}>{storeName}</span>
        </a>
        <a className={styles.cartLink} href="#order-request">
          <span aria-hidden="true">▣</span><span>Order & checkout</span>
        </a>
      </header>

      <section className={styles.hero} id="top" aria-labelledby="store-heading">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>THE ONLINE STORE</p>
          <h1 id="store-heading">Good finds.<br /><span>Easy ordering.</span></h1>
          <p>Explore the collection, choose what you need, and send your order in a few simple steps.</p>
          <a className={styles.heroAction} href="#shop">Explore products <span aria-hidden="true">↓</span></a>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <span className={styles.artCircle} />
          <span className={styles.artCard}><span>YOUR NEXT<br />FAVOURITE<br /><strong>IS HERE.</strong></span></span>
          <span className={styles.artSpark}>✳</span>
        </div>
      </section>

      <div className={styles.serviceStrip} aria-label="Shopping information">
        <div><span className={styles.serviceIcon} aria-hidden="true">✓</span><span><strong>Clear pricing</strong><small>See prices before ordering</small></span></div>
        <div><span className={styles.serviceIcon} aria-hidden="true">↗</span><span><strong>Simple ordering</strong><small>Send your order online</small></span></div>
        <div><span className={styles.serviceIcon} aria-hidden="true">♡</span><span><strong>Local business</strong><small>Support a growing business</small></span></div>
      </div>

      <section className={styles.shop} id="shop" aria-labelledby="catalog-heading">
        <div className={styles.sectionHeading}>
          <div><p className={styles.kicker}>MADE FOR YOU</p><h2 id="catalog-heading">Shop the collection</h2><p>Find something you’ll love.</p></div>
          <span className={styles.resultCount}>{filtered.length} {filtered.length === 1 ? "item" : "items"}</span>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <span aria-hidden="true">⌕</span>
            <span className={styles.visuallyHidden}>Search products</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products…" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
          </label>
          <label className={styles.sortControl}><span>Sort by</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </label>
        </div>

        <div className={styles.categoryList} aria-label="Filter by category">
          {categories.map((name) => <button type="button" key={name} className={category === name ? styles.categoryActive : styles.category} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}
        </div>

        {filtered.length ? <div className={styles.productGrid}>
          {filtered.map((product) => {
            const pricedVariants = product.variants.filter((variant) => variant.price_minor >= 0);
            const lowest = pricedVariants.length ? Math.min(...pricedVariants.map((variant) => variant.price_minor)) : null;
            const currency = pricedVariants[0]?.currency ?? "KES";
            const inStock = product.variants.some((variant) => variant.available_quantity === null || variant.available_quantity > 0);
            return <article className={styles.productCard} key={product.product_id}>
              <a className={styles.productImage} href="#order-request" aria-label={`View order options for ${product.product_title}`}>
                {product.images[0]?.url ? <Image src={product.images[0].url} alt={product.images[0].alt || product.product_title} fill sizes="(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 25vw" unoptimized /> : <span className={styles.imagePlaceholder}><span aria-hidden="true">◇</span><small>Product image</small></span>}
                {product.category_name && <span className={styles.productBadge}>{product.category_name}</span>}
              </a>
              <div className={styles.productInfo}>
                <div className={styles.productTitleRow}><h3>{product.product_title}</h3><span className={inStock ? styles.stock : styles.outOfStock}><i />{inStock ? "Available" : "Sold out"}</span></div>
                {product.product_description && <p className={styles.productDescription}>{product.product_description}</p>}
                <div className={styles.productBottom}>
                  <div className={styles.priceBlock}><small>{product.variants.length > 1 ? "From" : "Price"}</small><strong>{lowest === null ? "Ask for price" : money(lowest, currency)}</strong></div>
                  <a className={styles.addButton} href="#order-request" aria-label={`Choose ${product.product_title} options`}><span>Choose options</span><span aria-hidden="true">↗</span></a>
                </div>
              </div>
            </article>;
          })}
        </div> : <div className={styles.emptyState}><span aria-hidden="true">⌕</span><h3>No products found</h3><p>Try another search or choose a different category.</p><button type="button" onClick={() => { setQuery(""); setCategory("All products"); }}>Clear filters</button></div>}
      </section>
      <p className={styles.catalogNote}>Product availability is checked again when you submit an order.</p>
    </>
  );
}
