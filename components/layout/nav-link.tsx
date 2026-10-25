"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The design pass (KM Sidebar, design system v3): 44 px items in the text colour; the active one a white
 * segment with a shadow and an edge (ds-06: more than a fill), in bold. The letter mark stays, quiet.
 * prefetch is off: each prefetch would be a Vercel invocation on the shared Hobby limit.
 */
export function AdminNavLink({
  href,
  label,
  symbol,
}: {
  href: string;
  label: string;
  symbol: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-[var(--km-radius-control)] border px-3 text-[0.9375rem] text-[var(--km-color-text)] ${
        active
          ? "border-[var(--km-color-border-strong)] bg-[var(--km-color-segment)] font-semibold shadow-[var(--km-shadow-1)]"
          : "border-transparent font-medium hover:bg-[var(--km-color-border)]"
      }`}
      href={href}
      prefetch={false}
    >
      <span
        aria-hidden="true"
        className={`grid size-6 shrink-0 place-items-center rounded-md text-[0.7rem] font-bold ${
          active
            ? "bg-[var(--km-color-select-soft)] text-[var(--km-color-action)]"
            : "text-[var(--km-color-text-secondary)]"
        }`}
      >
        {symbol}
      </span>
      {label}
    </Link>
  );
}
