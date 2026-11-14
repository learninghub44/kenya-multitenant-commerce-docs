"use client";

import { useMemo, useState } from "react";
import { ORDER_FILTERS, countByFilter, filterOrders, type OrderFilter } from "@/lib/order-filters";
import { telHref, whatsappHref } from "@/lib/phone";
import OrderActions from "./order-actions";
import styles from "./orders-board.module.css";

export type BoardItem = {
  id: string; product_title_snapshot: string; variant_title_snapshot: string; sku_snapshot: string | null;
  quantity: number; unitLabel: string; lineLabel: string;
};
export type BoardOrder = {
  id: string; order_number: string; status: string; payment_status: string;
  customer_name_snapshot: string; customer_phone_snapshot: string; delivery_address_snapshot: string; notes: string;
  totalLabel: string; placedLabel: string; items: BoardItem[];
};

const PAGE_SIZE = 20;

export default function OrdersBoard({ tenantId, orders, canRecordPayment, canManageOrders }: {
  tenantId: string; orders: BoardOrder[]; canRecordPayment: boolean; canManageOrders: boolean;
}) {
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const counts = useMemo(() => countByFilter(orders), [orders]);
  const matches = useMemo(() => filterOrders(orders, filter, query), [orders, filter, query]);
  const shown = matches.slice(0, visible);

  function choose(next: OrderFilter) { setFilter(next); setVisible(PAGE_SIZE); }
  function clear() { setFilter("all"); setQuery(""); setVisible(PAGE_SIZE); }

  return <>
    <div className={styles.toolbar}>
      <input
        className={styles.search} type="search" value={query} placeholder="Search order, customer, phone or product"
        aria-label="Search orders" autoComplete="off"
        onChange={event => { setQuery(event.target.value); setVisible(PAGE_SIZE); }}
      />
      <div className={styles.chips} role="group" aria-label="Filter orders by status">
        {ORDER_FILTERS.map(item => <button
          key={item.value} type="button" className={`${styles.chip} ${filter === item.value ? styles.chipActive : ""}`}
          aria-pressed={filter === item.value} onClick={() => choose(item.value)}
        >{item.label}<span>{counts[item.value]}</span></button>)}
      </div>
      <p className={styles.summary} role="status" aria-live="polite">
        {matches.length === orders.length ? `${orders.length} orders` : `${matches.length} of ${orders.length} orders`}
      </p>
    </div>

    <section className="workspace-list">
      {matches.length === 0 ? <div className="empty-state">
        <h2>No orders match</h2>
        <p>Try a different search or status filter.</p>
        <button className="secondary-button" type="button" onClick={clear}>Clear filters</button>
      </div> : shown.map(order => {
        const call = telHref(order.customer_phone_snapshot);
        const chat = whatsappHref(order.customer_phone_snapshot, `Hello ${order.customer_name_snapshot}, about your order ${order.order_number}.`);
        return <article className="order-card" key={order.id}>
          <div className="order-card-header">
            <div><p className="eyebrow">{order.order_number}</p><h2>{order.customer_name_snapshot}</h2><p>{order.customer_phone_snapshot}</p></div>
            <div className="order-badges"><span className="workspace-status">{order.status.replaceAll("_", " ")}</span><span className="workspace-status">{order.payment_status.replaceAll("_", " ")}</span></div>
          </div>
          {(call || chat) && <div className={styles.contactRow}>
            {call && <a className={styles.contactLink} href={call}>Call</a>}
            {chat && <a className={styles.contactLink} href={chat} target="_blank" rel="noreferrer">WhatsApp</a>}
          </div>}
          <p className="order-address">{order.delivery_address_snapshot || "No delivery address provided"}</p>
          {order.notes.trim() && <p className={styles.note}><strong>Customer note</strong>{order.notes}</p>}
          <ul className="order-line-list">{order.items.map(item => <li key={item.id}>
            <span>{item.product_title_snapshot} — {item.variant_title_snapshot}{item.sku_snapshot ? ` · ${item.sku_snapshot}` : ""}<small>Qty {item.quantity} × {item.unitLabel}</small></span>
            <strong>{item.lineLabel}</strong>
          </li>)}</ul>
          <div className="order-total"><span>Order total</span><strong>{order.totalLabel}</strong></div>
          <p className="field-help">Placed {order.placedLabel}</p>
          {(canRecordPayment || canManageOrders) && <OrderActions tenantId={tenantId} orderId={order.id} status={order.status} paymentStatus={order.payment_status} canRecordPayment={canRecordPayment} canManageOrders={canManageOrders} />}
        </article>;
      })}
      {matches.length > shown.length && <button className={`secondary-button ${styles.more}`} type="button" onClick={() => setVisible(count => count + PAGE_SIZE)}>
        Show more ({matches.length - shown.length} remaining)
      </button>}
    </section>
  </>;
}
