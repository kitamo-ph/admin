"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  if (mobile) {
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 font-medium ${
          active
            ? "bg-[#e3efe8] text-[#173f30]"
            : "text-[#364039] hover:bg-[#f0f6f2] hover:text-[#173f30]"
        }`}
        href={href}
      >
        <span
          aria-hidden="true"
          className={`grid size-7 place-items-center rounded-md text-xs font-bold ${
            active
              ? "bg-[#d3a33f] text-[#102f24]"
              : "bg-[#e3efe8] text-[#1e513d]"
          }`}
        >
          {symbol}
        </span>
        {label}
      </Link>
    );
  }

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-white/10 text-white"
          : "text-[#d8e5dc] hover:bg-white/8 hover:text-white"
      }`}
      href={href}
    >
      <span
        aria-hidden="true"
        className={`grid size-6 place-items-center rounded-md text-[0.68rem] font-bold ${
          active
            ? "bg-[#d3a33f] text-[#102f24]"
            : "bg-white/7 text-[#b9cec1] group-hover:bg-[#d3a33f] group-hover:text-[#102f24]"
        }`}
      >
        {symbol}
      </span>
      {label}
    </Link>
  );
}
