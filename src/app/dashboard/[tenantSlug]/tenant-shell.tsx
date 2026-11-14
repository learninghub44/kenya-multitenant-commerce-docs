"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { storeUrl } from "@/lib/store-url";
import { navItemsForRole, type NavItem } from "@/lib/navigation";
import { hasPermission } from "@/lib/permissions";
import Logo from "@/components/logo";
import NavIcon from "@/components/nav-icons";
import { BusinessIdChip } from "./business-badge";
import AccountMenu from "./account-menu";
import MobileMenu from "./mobile-menu";
import chrome from "./mobile-chrome.module.css";
import styles from "./tenant-shell.module.css";

type TenantShellProps = {
  tenantSlug: string;
  tenantName: string;
  role: string;
  email: string | null;
  businessCode?: string | null;
  children: ReactNode;
};

function roleLabel(role: string) {
  return role.replaceAll("_", " ");
}

export default function TenantShell({
  tenantSlug,
  tenantName,
  role,
  email,
  businessCode = null,
  children,
}: TenantShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const basePath = `/dashboard/${tenantSlug}`;
  // Single source of truth for what this role may open: the desktop sidebar,
  // the phone menu sheet and the bottom bar all derive from this list.
  const visibleItems = navItemsForRole(role);
  const activeItem = visibleItems.find((item) => item.path ? pathname === `${basePath}${item.path}` || pathname.startsWith(`${basePath}${item.path}/`) : pathname === basePath);
  const quickNavOrder = ["", "/orders", "/products", "/inventory", "/reports"];
  const mobileItems = quickNavOrder.map((path) => visibleItems.find((item) => item.path === path)).filter((item): item is NavItem => Boolean(item)).slice(0, 4);
  const settingsItem = visibleItems.find((item) => item.path === "/settings");
  const canAddProduct = hasPermission(role, "products.update");
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // The sheet is a phone-only surface; close it if the viewport grows past the breakpoint.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 761px)");
    function onChange(event: MediaQueryListEvent) {
      if (event.matches) setMenuOpen(false);
    }
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="tenant-app">
      <aside className={`tenant-sidebar ${styles.sidebar}`}>
        <div className="tenant-sidebar-heading">
          <Logo href="/dashboard" size={30} className="tenant-logo" />
        </div>

        <div className="tenant-side-context">
          <span className="tenant-side-label">Business workspace</span>
          <strong>{tenantName}</strong>
          <div className="tenant-side-meta">
            <span className="tenant-role">{roleLabel(role)}</span>
            {businessCode ? <BusinessIdChip code={businessCode} /> : null}
          </div>
        </div>

        <nav className={`tenant-navigation ${styles.navigation}`} aria-label="Business workspace">
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
                    key={item.path || "overview"}
                  >
                    <NavIcon name={item.path} size={18} className="tenant-nav-icon" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="tenant-sidebar-footer">
          <a href={storeUrl(tenantSlug)} target="_blank" rel="noreferrer">
            <NavIcon name="storefront" size={16} /> Storefront <span aria-hidden="true">↗</span>
          </a>
          <Link href="/dashboard"><NavIcon name="switch" size={16} /> Switch</Link>
        </div>
      </aside>

      <div className="tenant-stage">
        <header className="tenant-topbar">
          {/* Phone: logo mark, workspace pill, quick add, account dropdown. */}
          <span className={chrome.topbarMark}>
            <Logo href="/dashboard" size={36} markOnly />
          </span>
          <div className={chrome.workspacePill}>
            <span className={chrome.pillAvatar} aria-hidden="true">{(tenantName.trim().charAt(0) || "?").toUpperCase()}</span>
            <div className={chrome.pillText}>
              <small>{activeItem?.label ?? "Business workspace"}</small>
              <strong>{tenantName}</strong>
            </div>
          </div>
          <div className={chrome.mobileActions}>
            {canAddProduct && (
              <Link className={chrome.addButton} href={`${basePath}/products#add-product`} aria-label="Add product">
                <NavIcon name="plus" size={20} />
              </Link>
            )}
            <AccountMenu
              email={email}
              tenantSlug={tenantSlug}
              tenantName={tenantName}
              role={role}
              settingsHref={settingsItem ? `${basePath}${settingsItem.path}` : null}
            />
          </div>

          {/* Desktop: page context and account actions. */}
          <div className={`tenant-topbar-context ${chrome.desktopOnly}`}>
            <span>{activeItem?.label ?? "Business workspace"}</span>
            <strong>{tenantName}</strong>
          </div>
          <div className={`tenant-account ${chrome.desktopOnly}`}>
            {canAddProduct && (
              <Link className="tenant-topbar-action" href={`${basePath}/products#add-product`}>+ Add product</Link>
            )}
            {email && <span className="tenant-account-email">{email}</span>}
            <form action="/auth/signout" method="post">
              <button className="tenant-signout" type="submit">Sign out</button>
            </form>
          </div>
        </header>

        {menuOpen && (
          <MobileMenu
            items={visibleItems}
            basePath={basePath}
            pathname={pathname}
            tenantSlug={tenantSlug}
            onClose={closeMenu}
          />
        )}

        <a className={styles.skipLink} href="#tenant-main">Skip to main content</a>
        <div id="tenant-main" className={`tenant-content ${styles.content}`}>{children}</div>

        <nav className={styles.mobileNavigation} aria-label="Quick navigation">
          {mobileItems.map((item) => {
            const href = `${basePath}${item.path}`;
            const active = item.path ? pathname === href || pathname.startsWith(`${href}/`) : pathname === basePath;
            return (
              <Link key={item.path || "overview"} className={`${styles.mobileNavLink} ${active ? styles.active : ""}`} href={href} aria-current={active ? "page" : undefined}>
                <span className={styles.mobileNavIcon} aria-hidden="true"><NavIcon name={item.path} size={21} /></span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            className={`${styles.mobileNavLink} ${styles.mobileNavMenu} ${menuOpen ? styles.active : ""}`}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-controls="tenant-menu-sheet"
            onClick={() => setMenuOpen(true)}
          >
            <span className={styles.mobileNavIcon} aria-hidden="true"><NavIcon name="menu" size={21} /></span>
            <span>Menu</span>
          </button>
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
