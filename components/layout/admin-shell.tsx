import Link from "next/link";

import { AdminNavLink } from "./nav-link";

type NavigationItem = {
  href: string;
  label: string;
  symbol: string;
  group: "Workspace" | "Operations" | "Platform" | "Administration";
};

const navigation: NavigationItem[] = [
  { href: "/overview", label: "Overview", symbol: "⌂", group: "Workspace" },
  { href: "/users", label: "Users", symbol: "U", group: "Workspace" },
  { href: "/businesses", label: "Businesses", symbol: "B", group: "Workspace" },
  {
    href: "/devices",
    label: "Stalls & devices",
    symbol: "D",
    group: "Operations",
  },
  {
    href: "/synchronization",
    label: "Synchronization",
    symbol: "↻",
    group: "Operations",
  },
  {
    href: "/problem-reports",
    label: "Problem reports",
    symbol: "!",
    group: "Operations",
  },
  {
    href: "/app-versions",
    label: "App versions",
    symbol: "V",
    group: "Platform",
  },
  {
    href: "/audit-log",
    label: "Audit log",
    symbol: "A",
    group: "Platform",
  },
  {
    href: "/settings",
    label: "Settings",
    symbol: "⚙",
    group: "Administration",
  },
];

const groups = [
  "Workspace",
  "Operations",
  "Platform",
  "Administration",
] as const;

function Brand() {
  return (
    <Link
      className="flex items-center gap-3 rounded-lg"
      href="/overview"
      aria-label="KitaMo Admin overview"
    >
      <span className="grid size-9 place-items-center rounded-[0.65rem] bg-[#d3a33f] font-black text-[#102f24] shadow-[inset_0_0_0_1px_rgb(255_255_255/20%)]">
        K
      </span>
      <span>
        <span className="block text-base leading-4 font-bold tracking-[-0.02em] text-white">
          KitaMo
        </span>
        <span className="mt-1 block text-[0.67rem] font-semibold tracking-[0.15em] text-[#b9cec1] uppercase">
          Admin Platform
        </span>
      </span>
    </Link>
  );
}

function Navigation({
  allowedHrefs,
  mobile = false,
}: {
  allowedHrefs: string[];
  mobile?: boolean;
}) {
  const visible = navigation.filter((item) => allowedHrefs.includes(item.href));

  if (mobile) {
    return (
      <nav
        aria-label="Mobile admin navigation"
        className="grid gap-1 px-2 pb-3"
      >
        {visible.map((item) => (
          <AdminNavLink
            href={item.href}
            key={item.href}
            label={item.label}
            mobile
            symbol={item.symbol}
          />
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="Admin navigation" className="mt-8 flex-1">
      {groups.map((group) => {
        const items = visible.filter((item) => item.group === group);
        if (items.length === 0) return null;
        return (
          <div className="mb-6" key={group}>
            <p className="mb-2 px-3 text-[0.65rem] font-bold tracking-[0.15em] text-[#8eaa99] uppercase">
              {group}
            </p>
            <ul className="grid gap-1">
              {items.map((item) => (
                <li key={item.href}>
                  <AdminNavLink
                    href={item.href}
                    label={item.label}
                    symbol={item.symbol}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  children,
  roleLabel,
  adminName,
  allowedHrefs,
  roleControl,
}: {
  children: React.ReactNode;
  roleLabel: string;
  adminName: string;
  allowedHrefs: string[];
  roleControl?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className="hidden min-h-screen bg-[#102f24] px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-2">
          <Brand />
        </div>
        <Navigation allowedHrefs={allowedHrefs} />
        <div className="border-t border-white/10 px-2 pt-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full bg-[#d3a33f] text-xs font-bold text-[#102f24]"
            >
              KA
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {adminName}
              </p>
              <p className="truncate text-xs text-[#9db5a7]">{roleLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-[#dfe4df] bg-[#fffefa]/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <details className="group relative">
              <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-[#dfe4df] bg-white text-lg text-[#173f30] hover:bg-[#f0f6f2]">
                <span aria-hidden="true">≡</span>
                <span className="sr-only">Open navigation</span>
              </summary>
              <div className="fixed inset-x-3 top-[4.5rem] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-[#dfe4df] bg-[#fffefa] p-2 shadow-2xl">
                <div className="mb-2 flex items-center justify-between border-b border-[#e7ebe7] px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-lg bg-[#d3a33f] font-black text-[#102f24]">
                      K
                    </span>
                    <span className="font-semibold text-[#173f30]">
                      KitaMo Admin
                    </span>
                  </div>
                  <span className="text-xs text-[#69736d]">Navigation</span>
                </div>
                <Navigation allowedHrefs={allowedHrefs} mobile />
              </div>
            </details>
            <span className="font-bold tracking-tight text-[#173f30]">
              KitaMo Admin
            </span>
          </div>

          <div className="hidden lg:block">
            <p className="text-xs font-semibold tracking-[0.09em] text-[#69736d] uppercase">
              Internal operations
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {roleControl}
            <Link
              className="hidden rounded-lg border border-[#dfe4df] bg-white px-3 py-2 text-sm font-semibold text-[#173f30] hover:bg-[#f0f6f2] sm:inline-flex"
              href="/health"
            >
              System health
            </Link>
            <span
              aria-label={`Signed in as ${adminName}, ${roleLabel}`}
              className="grid size-9 place-items-center rounded-full bg-[#e3efe8] text-xs font-bold text-[#1e513d] lg:hidden"
              title={`${adminName} · ${roleLabel}`}
            >
              KA
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="border-t border-[#dfe4df] px-4 py-5 text-center text-xs text-[#69736d] sm:px-8">
          Mock operational environment · Fictional data only · No merchant
          transactions
        </footer>
      </div>
    </div>
  );
}
