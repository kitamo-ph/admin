"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * KitaMo's tab look (Operations' align/kitamo-feel @ 2daaf50): the active
 * item in the text colour with a rule beside it. prefetch is off: each
 * prefetch would be a Vercel invocation on the shared Hobby limit.
 */
export function AdminNavLink({
  href,
  label,
  symbol,
  mobile = false,
}: {
  href: string;
  label: string;
  symbol: string;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-11 items-center gap-3 rounded-[var(--km-radius-control)] border-l-2 px-3 py-2 ${
        mobile ? "font-medium" : "text-sm font-semibold"
      } ${
        active
          ? "border-[var(--km-color-text)] bg-[var(--km-color-muted)] text-[var(--km-color-text)]"
          : "border-transparent text-[var(--km-color-text-secondary)] hover:bg-[var(--km-color-muted)] hover:text-[var(--km-color-text)]"
      }`}
      href={href}
      prefetch={false}
    >
      <span
        aria-hidden="true"
        className={`grid size-7 place-items-center rounded-md text-xs font-bold ${
          active
            ? "bg-[var(--km-color-action)] text-[var(--km-color-action-foreground)]"
            : "bg-[var(--km-color-select-soft)] text-[var(--km-color-select)]"
        }`}
      >
        {symbol}
      </span>
      {label}
    </Link>
  );
}
