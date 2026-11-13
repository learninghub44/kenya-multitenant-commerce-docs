"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import NavIcon from "@/components/nav-icons";
import { storeUrl } from "@/lib/store-url";
import styles from "./mobile-chrome.module.css";

type AccountMenuProps = {
  email: string | null;
  tenantSlug: string;
  tenantName: string;
  role: string;
  /** Settings page href when the member's role may open it, otherwise null. */
  settingsHref: string | null;
};

function initialOf(value: string) {
  return (value.trim().charAt(0) || "?").toUpperCase();
}

export default function AccountMenu({ email, tenantSlug, tenantName, role, settingsHref }: AccountMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const displayName = email ? email.split("@")[0] : tenantName;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.account} ref={rootRef}>
      <button
        ref={buttonRef}
        className={`${styles.accountButton} ${open ? styles.accountButtonOpen : ""}`}
        type="button"
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="tenant-account-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <span className={styles.avatar} aria-hidden="true">{initialOf(displayName)}</span>
        <NavIcon name="chevron" size={18} className={styles.accountChevron} />
      </button>

      {open && (
        <div id="tenant-account-panel" className={styles.accountPanel}>
          <div className={styles.accountUser}>
            <span className={styles.avatar} aria-hidden="true">{initialOf(displayName)}</span>
            <div>
              <strong>{displayName}</strong>
              {email && <span>{email}</span>}
            </div>
          </div>

          <div className={styles.accountBusiness}>
            <NavIcon name="switch" size={22} className={styles.cardIcon} />
            <div>
              <small>Business</small>
              <strong>{tenantName}</strong>
              <span className={styles.rolePill}>{role.replaceAll("_", " ")}</span>
            </div>
          </div>

          <div className={styles.accountActions}>
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              <NavIcon name="switch" size={20} className={styles.cardIcon} />
              Switch business
            </Link>
            {settingsHref && (
              <Link href={settingsHref} onClick={() => setOpen(false)}>
                <NavIcon name="/settings" size={20} className={styles.cardIcon} />
                Settings
              </Link>
            )}
            <a href={storeUrl(tenantSlug)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
              <NavIcon name="storefront" size={20} className={styles.cardIcon} />
              View storefront
            </a>
            <form action="/auth/signout" method="post">
              <button type="submit">
                <NavIcon name="logout" size={20} className={styles.cardIcon} />
                Log out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
