"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { storeUrl } from "@/lib/store-url";

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
  const basePath = `/dashboard/${tenantSlug}`;
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  function renderNavigation(className: string) {
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

  return (
    <div className="tenant-app">
      <aside className="tenant-sidebar">
        <Link className="tenant-brand" href="/dashboard" aria-label="Commerce Workspace — all businesses">
          <span className="tenant-brand-mark" aria-hidden="true">C</span>
          <span>Commerce <span>Workspace</span></span>
        </Link>

        <div className="tenant-side-context">
          <span className="tenant-side-label">BUSINESS WORKSPACE</span>
          <strong>{tenantName}</strong>
          <span className="tenant-role">{roleLabel(role)}</span>
        </div>

        {renderNavigation("tenant-navigation")}

        <div className="tenant-sidebar-footer">
          <a href={storeUrl(tenantSlug)} target="_blank" rel="noreferrer">
            View storefront <span aria-hidden="true">↗</span>
          </a>
          <Link href="/dashboard">Switch business</Link>
        </div>
      </aside>

      <div className="tenant-stage">
        <header className="tenant-topbar">
          <div className="tenant-topbar-context">
            <span>BUSINESS WORKSPACE</span>
            <strong>{tenantName}</strong>
          </div>
          <div className="tenant-account">
            {email && <span className="tenant-account-email">{email}</span>}
            <form action="/auth/signout" method="post">
              <button className="tenant-signout" type="submit">Sign out</button>
            </form>
          </div>
        </header>

        {renderNavigation("tenant-mobile-navigation")}

        <div className="tenant-content">{children}</div>
      </div>
    </div>
  );
}
