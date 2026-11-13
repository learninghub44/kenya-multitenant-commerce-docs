"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import NavIcon from "@/components/nav-icons";
import type { NavItem } from "@/lib/navigation";
import { storeUrl } from "@/lib/store-url";
import styles from "./mobile-chrome.module.css";

type MobileMenuProps = {
  items: NavItem[];
  basePath: string;
  pathname: string;
  tenantSlug: string;
  onClose: () => void;
};

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const DISMISS_DISTANCE = 110;

/**
 * Phone navigation: a bottom sheet with every page the member's role may open,
 * grouped into two-column cards. `items` must already be filtered with
 * navItemsForRole so the sheet can never offer a page the role cannot access.
 */
export default function MobileMenu({ items, basePath, pathname, tenantSlug, onClose }: MobileMenuProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ startY: number; dy: number } | null>(null);
  const groups = Array.from(new Set(items.map((item) => item.group)));

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus?.();
    };
  }, [onClose]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { startY: event.clientY, dy: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current || !sheetRef.current) return;
    const dy = Math.max(0, event.clientY - drag.current.startY);
    drag.current.dy = dy;
    sheetRef.current.style.transform = `translateY(${dy}px)`;
  }

  function endDrag() {
    if (!drag.current || !sheetRef.current) return;
    const { dy } = drag.current;
    drag.current = null;
    sheetRef.current.style.transition = "";
    if (dy > DISMISS_DISTANCE) onClose();
    else sheetRef.current.style.transform = "";
  }

  return (
    <div className={styles.layer}>
      <button className={styles.backdrop} type="button" aria-label="Close menu" tabIndex={-1} onClick={onClose} />
      <div
        id="tenant-menu-sheet"
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-menu-title"
      >
        <div
          className={styles.grab}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className={styles.handle} aria-hidden="true" />
        </div>

        <div className={styles.sheetHeader}>
          <h2 id="tenant-menu-title">Menu</h2>
          <button ref={closeRef} className={styles.closeButton} type="button" aria-label="Close menu" onClick={onClose}>
            <NavIcon name="close" size={22} />
          </button>
        </div>

        <nav className={styles.sheetBody} aria-label="Business workspace">
          {groups.map((group) => (
            <section className={styles.section} key={group}>
              <h3 className={styles.sectionLabel}>{group}</h3>
              <div className={styles.grid}>
                {items.filter((item) => item.group === group).map((item) => {
                  const href = `${basePath}${item.path}`;
                  const active = item.path
                    ? pathname === href || pathname.startsWith(`${href}/`)
                    : pathname === basePath;
                  return (
                    <Link
                      key={item.path || "overview"}
                      href={href}
                      className={`${styles.card} ${active ? styles.cardActive : ""}`}
                      aria-current={active ? "page" : undefined}
                      onClick={onClose}
                    >
                      <NavIcon name={item.path} size={22} className={styles.cardIcon} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          <section className={styles.section}>
            <h3 className={styles.sectionLabel}>Account</h3>
            <div className={styles.grid}>
              <a className={styles.card} href={storeUrl(tenantSlug)} target="_blank" rel="noreferrer" onClick={onClose}>
                <NavIcon name="storefront" size={22} className={styles.cardIcon} />
                <span>View storefront</span>
              </a>
              <Link className={styles.card} href="/dashboard" onClick={onClose}>
                <NavIcon name="switch" size={22} className={styles.cardIcon} />
                <span>Switch business</span>
              </Link>
              <form className={styles.signOutForm} action="/auth/signout" method="post">
                <button className={styles.card} type="submit">
                  <NavIcon name="logout" size={22} className={styles.cardIcon} />
                  <span>Log out</span>
                </button>
              </form>
            </div>
          </section>
        </nav>
      </div>
    </div>
  );
}
