"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard", tourId: "nav-dashboard" },
  { href: "/admin", label: "Weight admin", tourId: "nav-admin" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="px-6 pt-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-ink">
            SP
          </span>
          <span className="font-display text-lg font-semibold text-ink">SupplierPulse</span>
        </div>
        <nav className="flex gap-1 rounded-full border border-border bg-surface-2 p-1 text-sm">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                data-tour={link.tourId}
                className={
                  active
                    ? "rounded-full bg-accent px-4 py-1.5 font-semibold text-accent-ink"
                    : "rounded-full px-4 py-1.5 text-ink-soft hover:text-ink"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
