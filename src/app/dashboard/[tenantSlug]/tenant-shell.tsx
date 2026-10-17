"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { storeUrl } from "@/lib/store-url";
import Logo from "@/components/logo";

type TenantShellProps = {
  tenantSlug: string;
  tenantName: string;
  role: string;
  email: string | null;
  children: ReactNode;
};

const navItems = [
  { label: "Overview", path: "", roles: ["owner", "manager", "catalog_editor", "stock_clerk", "order_operator", "finance_viewer"] },
  { label: "Products", path: "/products", roles: ["owner", "manager", "catalog_editor"] },
  { label: "Categories", path: "/categories", roles: ["owner", "manager", "catalog_editor"] },
  { label: "Inventory", path: "/inventory", roles: ["owner", "manager", "stock_clerk"] },
  { label: "Orders", path: "/orders", roles: ["owner", "manager", "order_operator"] },
  { label: "Business records", path: "/erp", roles: ["owner", "manager"] },
  { label: "Reports", path: "/reports", roles: ["owner", "manager", "finance_viewer"] },
  { label: "Store profile", path: "/settings", roles: ["owner", "manager"] },
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
  const [openPath, setOpenPath] = useState(pathname);
  const basePath = `/dashboard/${tenantSlug}`;
  const visibleItems = navItems.filter((item) => item.roles.includes(role));
  const drawerIsOpen = mobileNavOpen && openPath === pathname;

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
      <nav className={className} aria-label="Business workspace">
        {visibleItems.map((item) => {
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
      </nav>
    );
  }

  function renderSidebar(onNavigate?: () => void, drawer = false) {
    return (
      <aside className={drawer ? "tenant-sidebar tenant-sidebar-drawer" : "tenant-sidebar"}>
        <div className="tenant-sidebar-heading">
          <Logo href="/dashboard" size={40} className="tenant-logo" />
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
                setOpenPath(pathname);
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
            <span>Business workspace</span>
            <strong>{tenantName}</strong>
          </div>
          <div className="tenant-account">
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

        <div className="tenant-content">{children}</div>
      </div>
    </div>
  );
}
