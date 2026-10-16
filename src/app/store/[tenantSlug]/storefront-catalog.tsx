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
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

function lowestPrice(product: StoreProduct) {
  const prices = product.variants
    .map((variant) => variant.price_minor)
    .filter((price) => Number.isFinite(price) && price >= 0);
  return prices.length ? Math.min(...prices) : null;
}

export default function StorefrontCatalog({
  storeName,
  products,
}: {
  storeName: string;
  products: StoreProduct[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All products");
  const [sort, setSort] = useState("featured");

  const categories = useMemo(
    () => [
      "All products",
      ...Array.from(
        new Set(
          products
            .map((product) => product.category_name)
            .filter((name): name is string => Boolean(name)),
        ),
      ),
    ],
    [products],
  );

  const categoryDetails = useMemo(
    () =>
      categories.map((name) => {
        const categoryProducts =
          name === "All products"
            ? products
            : products.filter((product) => product.category_name === name);
        const representative = categoryProducts.find((product) => product.images[0]?.url);
        return {
          name,
          count: categoryProducts.length,
          image: representative?.images[0] ?? null,
        };
      }),
    [categories, products],
  );

  const heroProducts = products.slice(0, 3);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const result = products.filter((product) => {
      const matchesCategory =
        category === "All products" || product.category_name === category;
      const matchesQuery =
        !normalized ||
        [
          product.product_title,
          product.product_description,
          product.category_name ?? "",
        ].some((value) => value.toLocaleLowerCase().includes(normalized));
      return matchesCategory && matchesQuery;
    });

    if (sort === "price-low" || sort === "price-high") {
      result.sort((a, b) => {
        const priceA = lowestPrice(a) ?? (sort === "price-low" ? Infinity : -Infinity);
        const priceB = lowestPrice(b) ?? (sort === "price-low" ? Infinity : -Infinity);
        return sort === "price-low" ? priceA - priceB : priceB - priceA;
      });
    } else if (sort === "name") {
      result.sort((a, b) => a.product_title.localeCompare(b.product_title));
    }

    return result;
  }, [products, query, category, sort]);

  return (
    <>
      <header className={styles.storeHeader}>
        <a className={styles.brand} href="#top" aria-label={`${storeName} home`}>
          <span className={styles.brandMark} aria-hidden="true">
            {storeName.trim().charAt(0).toLocaleUpperCase()}
          </span>
          <span className={styles.brandName}>{storeName}</span>
        </a>
        <a className={styles.cartLink} href="#order-request">
          <span aria-hidden="true">▣</span>
          <span>Order &amp; checkout</span>
        </a>
      </header>

      <section className={styles.hero} id="top" aria-labelledby="store-heading">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>THE ONLINE STORE</p>
          <h1 id="store-heading">
            Good finds.
            <br />
            <span>Easy ordering.</span>
          </h1>
          <p>
            Explore the collection, compare prices, and send your order in a few
            simple steps.
          </p>
          <a className={styles.heroAction} href="#shop">
            Explore products <span aria-hidden="true">↓</span>
          </a>
          <p className={styles.heroNote}>Browse the catalogue. Order directly from the store.</p>
        </div>

        <div className={styles.heroArt} aria-label="Featured products">
          {heroProducts.map((product, index) => {
            const image = product.images[0];
            const price = lowestPrice(product);
            const currency = product.variants[0]?.currency ?? "KES";
            return (
              <article
                className={`${styles.heroProduct} ${styles[`heroProduct${index + 1}`] ?? ""}`}
                key={product.product_id}
              >
                <div className={styles.heroProductImage}>
                  {image?.url ? (
                    <Image
                      src={image.url}
                      alt={image.alt || product.product_title}
                      fill
                      sizes="(max-width: 520px) 30vw, 220px"
                      unoptimized
                    />
                  ) : (
                    <span aria-hidden="true">◇</span>
                  )}
                </div>
                <div className={styles.heroProductInfo}>
                  <span>{product.category_name || "Featured"}</span>
                  <strong>{product.product_title}</strong>
                  <small>{price === null ? "Ask for price" : money(price, currency)}</small>
                </div>
              </article>
            );
          })}
          <span className={styles.heroArtLabel}>FROM THIS STORE</span>
        </div>
      </section>

      <div className={styles.serviceStrip} aria-label="Shopping information">
        <div>
          <span className={styles.serviceIcon} aria-hidden="true">✓</span>
          <span><strong>Clear pricing</strong><small>See prices before ordering</small></span>
        </div>
        <div>
          <span className={styles.serviceIcon} aria-hidden="true">↗</span>
          <span><strong>Simple ordering</strong><small>Send an order request online</small></span>
        </div>
        <div>
          <span className={styles.serviceIcon} aria-hidden="true">◎</span>
          <span><strong>Stock visibility</strong><small>Availability shown on products</small></span>
        </div>
      </div>

      <section className={styles.shop} id="shop" aria-labelledby="catalog-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>MADE FOR YOU</p>
            <h2 id="catalog-heading">Shop the collection</h2>
            <p>Explore categories or search for something specific.</p>
          </div>
          <span className={styles.resultCount} aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "item" : "items"}
          </span>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <span aria-hidden="true">⌕</span>
            <span className={styles.visuallyHidden}>Search products</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products…"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                ×
              </button>
            )}
          </label>
          <label className={styles.sortControl}>
            <span>Sort by</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </label>
        </div>

        <div className={styles.categoryList} aria-label="Browse product categories">
          {categoryDetails.map((item) => (
            <button
              type="button"
              key={item.name}
              className={category === item.name ? styles.categoryActive : styles.category}
              aria-pressed={category === item.name}
              onClick={() => setCategory(item.name)}
            >
              <span className={styles.categoryThumb}>
                {item.image?.url ? (
                  <Image
                    src={item.image.url}
                    alt=""
                    fill
                    sizes="76px"
                    unoptimized
                  />
                ) : (
                  <span aria-hidden="true">▦</span>
                )}
              </span>
              <span className={styles.categoryText}>
                <strong>{item.name}</strong>
                <small>{item.count} {item.count === 1 ? "item" : "items"}</small>
              </span>
            </button>
          ))}
        </div>

        {filtered.length ? (
          <div className={styles.productGrid}>
            {filtered.map((product) => {
              const price = lowestPrice(product);
              const currency = product.variants.find((variant) => variant.price_minor >= 0)?.currency ?? "KES";
              const inStock = product.variants.some(
                (variant) =>
                  variant.available_quantity === null || variant.available_quantity > 0,
              );
              return (
                <article className={styles.productCard} key={product.product_id}>
                  <a
                    className={styles.productImage}
                    href="#order-request"
                    aria-label={`View order options for ${product.product_title}`}
                  >
                    {product.images[0]?.url ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.images[0].alt || product.product_title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 25vw"
                        unoptimized
                      />
                    ) : (
                      <span className={styles.imagePlaceholder}>
                        <span aria-hidden="true">◇</span>
                        <small>Product image</small>
                      </span>
                    )}
                    {product.category_name && (
                      <span className={styles.productBadge}>{product.category_name}</span>
                    )}
                  </a>
                  <div className={styles.productInfo}>
                    <div className={styles.productTitleRow}>
                      <h3>{product.product_title}</h3>
                      <span className={inStock ? styles.stock : styles.outOfStock}>
                        <i />
                        {inStock ? "Available" : "Sold out"}
                      </span>
                    </div>
                    {product.product_description && (
                      <p className={styles.productDescription}>{product.product_description}</p>
                    )}
                    <div className={styles.productBottom}>
                      <div className={styles.priceBlock}>
                        <small>{product.variants.length > 1 ? "From" : "Price"}</small>
                        <strong>{price === null ? "Ask for price" : money(price, currency)}</strong>
                      </div>
                      {inStock ? (
                        <a
                          className={styles.addButton}
                          href="#order-request"
                          aria-label={`Choose ${product.product_title} options`}
                        >
                          <span>Choose options</span><span aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <span className={styles.soldOutAction} aria-label="Product sold out">
                          Sold out
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span aria-hidden="true">⌕</span>
            <h3>No products found</h3>
            <p>Try another search or choose a different category.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("All products");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
      <p className={styles.catalogNote}>
        Product availability is checked again when you submit an order. Online payment is not enabled.
      </p>
    </>
  );
}
