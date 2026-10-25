import Link from "next/link";

import { LegalLinks } from "./legal-links";
import { AdminNavLink } from "./nav-link";
import { PhoneTabs } from "./phone-tabs";
import { ReadOnlyLine } from "./read-only-line";

type NavigationItem = {
  href: string;
  label: string;
  symbol: string;
  group: "Workspace" | "Operations" | "Platform" | "Administration";
};

/**
 * R16 sections first (Overview, Businesses, Flags, Access log, Associations).
 * The mock-first sections stay for development and are filtered out of a
 * KitaMo session by the layout (parked until R23, ADM-048).
 */
const navigation: NavigationItem[] = [
  { href: "/overview", label: "Overview", symbol: "⌂", group: "Workspace" },
  { href: "/businesses", label: "Businesses", symbol: "B", group: "Workspace" },
  { href: "/flags", label: "Flags", symbol: "F", group: "Workspace" },
  {
    href: "/audit-log",
    label: "Access log",
    symbol: "A",
    group: "Workspace",
  },
  {
    href: "/associations",
    label: "Associations",
    symbol: "H",
    group: "Workspace",
  },
  { href: "/users", label: "Users", symbol: "U", group: "Operations" },
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

/** The design pass (KM Bottom Bar): a phone's tabs; every other section this admin may open goes under More. */
const PHONE_TABS = ["/overview", "/businesses", "/flags", "/audit-log"];

/** KitaMo's mark and name (the header of Operations' align/kitamo-feel @ 2daaf50). */
function Brand() {
  return (
    <Link
      aria-label="KitaMo Admin overview"
      className="brand rounded-lg"
      href="/overview"
      prefetch={false}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a 30 px static mark */}
      <img alt="" height={30} src="/kitamo-mark.png" width={30} />
      <span>KitaMo Admin</span>
    </Link>
  );
}

function Navigation({ allowedHrefs }: { allowedHrefs: string[] }) {
  const visible = navigation.filter((item) => allowedHrefs.includes(item.href));

  return (
    <nav aria-label="Admin navigation" className="mt-8 flex-1">
      {groups.map((group) => {
        const items = visible.filter((item) => item.group === group);
        if (items.length === 0) return null;
        return (
          <div className="mb-6" key={group}>
            <p className="mb-2 px-3 text-[0.65rem] font-bold tracking-[0.15em] text-[var(--km-color-text-secondary)] uppercase">
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
  banner,
  kitamo = false,
}: {
  children: React.ReactNode;
  roleLabel: string;
  adminName: string;
  allowedHrefs: string[];
  roleControl?: React.ReactNode;
  /** The 30-minute access banner (R16). */
  banner?: React.ReactNode;
  /** A KitaMo (production) session: no mock tools, no parked links. */
  kitamo?: boolean;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className="hidden min-h-screen border-r border-[var(--km-color-border)] bg-[var(--km-color-surface)] px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-2">
          <Brand />
        </div>
        <Navigation allowedHrefs={allowedHrefs} />
        <div className="border-t border-[var(--km-color-border)] px-2 pt-4">
          <p className="truncate text-sm font-semibold text-[var(--km-color-text)]">
            {adminName}
          </p>
          <p className="truncate text-xs text-[var(--km-color-text-secondary)]">
            {roleLabel}
          </p>
        </div>
      </aside>

      <div className="min-w-0 pb-20 lg:pb-0">
        <header className="top">
          {/* Below the laptop width the sections are the bottom bar's (PhoneTabs, the design pass). */}
          <div className="flex items-center gap-3 lg:hidden">
            <Brand />
          </div>

          <div className="hidden lg:block">
            {kitamo ? (
              <ReadOnlyLine />
            ) : (
              <p className="text-xs font-semibold tracking-[0.09em] uppercase">
                Internal operations
              </p>
            )}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {roleControl}
            {kitamo ? null : (
              <Link
                className="km-button-secondary km-button-small hidden sm:inline-flex"
                href="/health"
                prefetch={false}
              >
                System health
              </Link>
            )}
            <span
              aria-label={`Signed in as ${adminName}, ${roleLabel}`}
              className="text-xs font-semibold text-[var(--km-color-text-secondary)] lg:hidden"
              title={`${adminName} · ${roleLabel}`}
            >
              {roleLabel}
            </span>
          </div>
        </header>
        {/* The design pass (mkt-adm-01, a legal HIGH): the line on every signed-in page at EVERY width, so below
            the laptop width too, under the header and above the access banner (the canvas's phone line). */}
        <div className="border-b border-[var(--km-color-border)] px-4 py-2 sm:px-8 lg:hidden">
          {kitamo ? (
            <ReadOnlyLine />
          ) : (
            <p className="text-xs font-semibold tracking-[0.09em] text-[var(--km-color-text-secondary)] uppercase">
              Internal operations
            </p>
          )}
        </div>
        {banner}
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="border-t border-[var(--km-color-border)] px-4 py-5 text-center text-xs text-[var(--km-color-text-secondary)] sm:px-8">
          {kitamo
            ? "KitaMo Admin · read-only toward businesses · every access needs a reason, lasts 30 minutes, and is shown to the business"
            : "Mock operational environment · Fictional data only · No merchant transactions"}
          <LegalLinks className="mt-2" />
        </footer>
        <PhoneTabs
          more={navigation
            .filter(
              (item) =>
                allowedHrefs.includes(item.href) &&
                !PHONE_TABS.includes(item.href),
            )
            .map(({ href, label, symbol }) => ({ href, label, symbol }))}
          tabs={navigation
            .filter(
              (item) =>
                allowedHrefs.includes(item.href) &&
                PHONE_TABS.includes(item.href),
            )
            .map(({ href, label, symbol }) => ({ href, label, symbol }))}
        />
      </div>
    </div>
  );
}
