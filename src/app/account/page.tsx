import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storeUrl } from "@/lib/store-url";
import { formatMoney, orderStatusLabel, type BuyerOrder } from "@/lib/order-labels";
import Logo from "@/components/logo";
import BuyerProfileForm from "@/components/buyer-profile-form";
import { localKenyanPhone } from "@/lib/auth-helpers";
import styles from "./account.module.css";

export const metadata: Metadata = { title: "My account — Commerce Workspace" };

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=${encodeURIComponent("/account")}`);

  const [{ data: profile }, { data: orderData, error: ordersError }] = await Promise.all([
    supabase.from("buyer_profiles").select("full_name, phone, default_address").eq("user_id", user.id).maybeSingle(),
    supabase.rpc("get_my_orders"),
  ]);
  const meta = (user.user_metadata ?? {}) as { full_name?: string; phone?: string };
  const orders = (orderData ?? []) as BuyerOrder[];

  const stores = new Map<string, { name: string; slug: string; orders: BuyerOrder[] }>();
  for (const order of orders) {
    const entry = stores.get(order.store_slug) ?? { name: order.store_name, slug: order.store_slug, orders: [] };
    entry.orders.push(order);
    stores.set(order.store_slug, entry);
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <Logo href="/" size={38} />
        <form action="/auth/signout" method="post"><button className={styles.signOut} type="submit">Sign out</button></form>
      </header>

      <section className={styles.intro}>
        <h1>My account</h1>
        <p>{user.email}</p>
      </section>

      <section aria-labelledby="orders-heading">
        <h2 id="orders-heading">My orders</h2>
        {ordersError && <p className="form-message error" role="alert">Could not load your orders. Please try again.</p>}
        {!ordersError && stores.size === 0 && <p className={styles.empty}>You have not placed any orders while signed in yet. Orders from every shop will appear here.</p>}
        {[...stores.values()].map(store => (
          <div className={styles.store} key={store.slug}>
            <div className={styles.storeHead}>
              <h3>{store.name}</h3>
              <a href={storeUrl(store.slug)}>Visit shop</a>
            </div>
            <ul>
              {store.orders.map(order => (
                <li className={styles.order} key={order.order_id}>
                  <div className={styles.orderTop}>
                    <strong>{order.order_number}</strong>
                    <span className={styles.pill}>{orderStatusLabel(order.status)}</span>
                  </div>
                  <p className={styles.meta}>{new Date(order.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })} · {formatMoney(order.total_minor, order.currency)}</p>
                  <ul className={styles.items}>
                    {order.items.map((item, index) => <li key={index}>{item.quantity} × {item.title}{item.variant && item.variant.toLowerCase() !== "default" ? ` (${item.variant})` : ""}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="details-heading" className={styles.details}>
        <h2 id="details-heading">My details</h2>
        <p className={styles.meta}>Saved details are filled in for you at checkout.</p>
        <BuyerProfileForm initial={{ name: profile?.full_name ?? meta.full_name ?? "", phone: localKenyanPhone(profile?.phone ?? meta.phone ?? ""), address: profile?.default_address ?? "" }} />
      </section>

      <p className={styles.foot}>Selling something? <Link href="/dashboard">Open your seller dashboard</Link></p>
    </main>
  );
}
