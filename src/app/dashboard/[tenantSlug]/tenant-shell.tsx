"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { storeUrl } from "@/lib/store-url";
import Logo from "@/components/logo";
import styles from "./tenant-shell.module.css";

type TenantShellProps = {
  tenantSlug: string;
  tenantName: string;
  role: string;
  email: string | null;
  children: ReactNode;
};

const navItems = [
  { label: "Overview", path: "", group: "Workspace", roles: ["owner", "manager", "catalog_editor", "stock_clerk", "order_operator", "finance_viewer"] },
  { label: "Orders", path: "/orders", group: "Sales", roles: ["owner", "manager", "order_operator"] },
  { label: "Products", path: "/products", group: "Sales", roles: ["owner", "manager", "catalog_editor"] },
  { label: "Categories", path: "/categories", group: "Sales", roles: ["owner", "manager", "catalog_editor"] },
  { label: "Inventory", path: "/inventory", group: "Operations", roles: ["owner", "manager", "stock_clerk"] },
  { label: "Business records", path: "/erp", group: "Operations", roles: ["owner", "manager"] },
  { label: "Reports", path: "/reports", group: "Operations", roles: ["owner", "manager", "finance_viewer"] },
  { label: "Store profile", path: "/settings", group: "Manage", roles: ["owner", "manager"] },
  { label: "Team", path: "/team", group: "Manage", roles: ["owner"] },
  { label: "Activity", path: "/activity", group: "Manage", roles: ["owner"] },
  { label: "Support", path: "/support", group: "Help", roles: ["owner", "manager", "catalog_editor", "stock_clerk", "order_operator", "finance_viewer"] },
];

function roleLabel(role: string) {
  return role.replaceAll("_", " ");
}

export default function TenantShell({
  tenantSlug,
  tenantName,
  role,
  email,
  children,
}: TenantShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const basePath = `/dashboard/${tenantSlug}`;
  const visibleItems = navItems.filter((item) => item.roles.includes(role));
  const drawerIsOpen = mobileNavOpen;
  const activeItem = visibleItems.find((item) => item.path ? pathname === `${basePath}${item.path}` || pathname.startsWith(`${basePath}${item.path}/`) : pathname === basePath);
  const quickNavOrder = ["", "/orders", "/products", "/inventory", "/reports"];
  const mobileItems = quickNavOrder.map((path) => visibleItems.find((item) => item.path === path)).filter((item): item is (typeof navItems)[number] => Boolean(item)).slice(0, 4);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerIsOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileNavOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerIsOpen]);

  function closeMobileNavigation() {
    setMobileNavOpen(false);
  }

  function renderNavigation(className: string, onNavigate?: () => void) {
    return (
      <nav className={`${className} ${styles.navigation}`} aria-label="Business workspace">
        {Array.from(new Set(visibleItems.map((item) => item.group))).map((group) => (
          <div className={styles.navigationGroup} key={group}>
            <span className={styles.navigationLabel}>{group}</span>
            {visibleItems.filter((item) => item.group === group).map((item) => {
          const href = `${basePath}${item.path}`;
          const active = item.path
            ? pathname === href || pathname.startsWith(`${href}/`)
            : pathname === basePath;

          return (
            <Link
              className={`tenant-nav-link${active ? " is-active" : ""}`}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              key={item.path || "overview"}
            >
              <span className="tenant-nav-mark" aria-hidden="true" />
              {item.label}
            </Link>
          );
            })}
          </div>
        ))}
      </nav>
    );
  }

  function renderSidebar(onNavigate?: () => void, drawer = false) {
    return (
      <aside className={drawer ? `tenant-sidebar tenant-sidebar-drawer ${styles.sidebar}` : `tenant-sidebar ${styles.sidebar}`}>
        <div className="tenant-sidebar-heading">
          <Logo href="/dashboard" size={drawer ? 34 : 40} className="tenant-logo" />
          {drawer && (
            <button
              className="tenant-drawer-close"
              type="button"
              aria-label="Close navigation"
              onClick={closeMobileNavigation}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="tenant-side-context">
          <span className="tenant-side-label">Business workspace</span>
          <strong>{tenantName}</strong>
          <span className="tenant-role">{roleLabel(role)}</span>
        </div>

        {renderNavigation("tenant-navigation", onNavigate)}

        <div className="tenant-sidebar-footer">
          <a href={storeUrl(tenantSlug)} target="_blank" rel="noreferrer" onClick={onNavigate}>
            View storefront <span aria-hidden="true">↗</span>
          </a>
          <Link href="/dashboard" onClick={onNavigate}>Switch business</Link>
        </div>
      </aside>
    );
  }

  return (
    <div className="tenant-app">
      {renderSidebar()}

      <div className="tenant-stage">
        <header className="tenant-topbar">
          <button
            className="tenant-mobile-menu-button"
            type="button"
            aria-label={drawerIsOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={drawerIsOpen}
            aria-controls="tenant-mobile-drawer"
            onClick={() => {
              if (drawerIsOpen) {
                closeMobileNavigation();
              } else {
                setMobileNavOpen(true);
              }
            }}
          >
            {drawerIsOpen ? (
              <svg viewBox="0 0 24 24" width="23" height="23" fill="none" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="23" height="23" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <Logo href="/dashboard" size={36} markOnly className="tenant-topbar-logo" />
          <div className="tenant-topbar-context">
            <span>{activeItem?.label ?? "Business workspace"}</span>
            <strong>{tenantName}</strong>
          </div>
          <div className="tenant-account">
            {["owner", "manager", "catalog_editor"].includes(role) && (
              <Link className="tenant-topbar-action" href={`${basePath}/products#add-product`}>+ Add product</Link>
            )}
            {email && <span className="tenant-account-email">{email}</span>}
            <form action="/auth/signout" method="post">
              <button className="tenant-signout" type="submit">Sign out</button>
            </form>
          </div>
        </header>

        {drawerIsOpen && (
          <div className="tenant-mobile-drawer-layer">
            <button
              className="tenant-mobile-backdrop"
              type="button"
              aria-label="Close navigation"
              onClick={closeMobileNavigation}
            />
            <div id="tenant-mobile-drawer" className="tenant-mobile-drawer" role="dialog" aria-modal="true" aria-label="Business navigation">
              {renderSidebar(closeMobileNavigation, true)}
            </div>
          </div>
        )}

        <a className={styles.skipLink} href="#tenant-main">Skip to main content</a>
        <div id="tenant-main" className={`tenant-content ${styles.content}`}>{children}</div>

        <nav className={styles.mobileNavigation} aria-label="Quick navigation">
          {mobileItems.map((item) => {
            const href = `${basePath}${item.path}`;
            const active = item.path ? pathname === href || pathname.startsWith(`${href}/`) : pathname === basePath;
            return <Link key={item.path || "overview"} className={`${styles.mobileNavLink} ${active ? styles.active : ""}`} href={href} aria-current={active ? "page" : undefined}>
              <span className={styles.mobileNavIcon} aria-hidden="true">{item.label === "Overview" ? "⌂" : item.label === "Orders" ? "▤" : item.label === "Products" ? "□" : "▥"}</span>
              <span>{item.label}</span>
            </Link>;
          })}
        </nav>
        <footer className={styles.supportFooter}>
          <div><strong>Need a hand?</strong><span>Our support team can help.</span></div>
          <Link href={`${basePath}/support`}>Visit help centre <span aria-hidden="true">→</span></Link>
          <a href="tel:+254701059192">+254 701 059 192</a>
          <a href="mailto:support@christech.co.ke">support@christech.co.ke</a>
        </footer>
      </div>
    </div>
  );
}
