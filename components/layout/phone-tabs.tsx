"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LegalLinks } from "./legal-links";

export type PhoneTab = { href: string; label: string; symbol: string };

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/**
 * The design pass (Oct 24, Admin on a phone; KM Bottom Bar): below the laptop
 * width, the main sections as a bottom bar (Overview, Businesses, Flags,
 * Access log, whichever this admin may open) and More, a sheet with every other
 * section this admin may open (Associations among them) and Privacy · Terms.
 * Sign out stays in the top bar (with the idle lock, which mounts once). More is
 * a <details>: it opens without JavaScript; a link inside closes it. prefetch is
 * off, as in the sidebar (each prefetch is a Vercel invocation).
 */
export function PhoneTabs({
  tabs,
  more,
}: {
  tabs: PhoneTab[];
  more: PhoneTab[];
}) {
  const pathname = usePathname();
  const moreActive = more.some((item) => isActive(pathname, item.href));
  const close = (event: React.MouseEvent<HTMLElement>) => {
    const sheet = event.currentTarget.closest("details");
    if (sheet) sheet.open = false;
  };
  const tabClass = (active: boolean) =>
    `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[0.72rem] font-semibold ${
      active
        ? "text-[var(--km-color-text)]"
        : "text-[var(--km-color-text-secondary)] hover:text-[var(--km-color-text)]"
    }`;
  const mark = (active: boolean) =>
    `grid size-6 place-items-center rounded-md text-[0.7rem] font-bold ${
      active
        ? "bg-[var(--km-color-action)] text-[var(--km-color-action-foreground)]"
        : "bg-[var(--km-color-select-soft)] text-[var(--km-color-select)]"
    }`;

  return (
    <nav
      aria-label="Admin tabs"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--km-color-border)] bg-[var(--km-color-surface)] pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li className="flex flex-1" key={tab.href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={tabClass(active)}
                href={tab.href}
                prefetch={false}
              >
                <span aria-hidden="true" className={mark(active)}>
                  {tab.symbol}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <details className="group flex flex-1">
            <summary
              className={`${tabClass(moreActive)} cursor-pointer list-none`}
            >
              <span aria-hidden="true" className={mark(moreActive)}>
                ⋯
              </span>
              More
            </summary>
            <div className="fixed inset-x-3 bottom-[4.5rem] z-40 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[var(--km-radius-surface)] border border-[var(--km-color-border)] bg-[var(--km-color-surface)] p-2 shadow-2xl">
              <ul className="grid gap-1">
                {more.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-11 items-center gap-3 rounded-[var(--km-radius-control)] px-3 py-2 font-medium ${
                          active
                            ? "bg-[var(--km-color-muted)] text-[var(--km-color-text)]"
                            : "text-[var(--km-color-text-secondary)] hover:bg-[var(--km-color-muted)] hover:text-[var(--km-color-text)]"
                        }`}
                        href={item.href}
                        onClick={close}
                        prefetch={false}
                      >
                        <span aria-hidden="true" className={mark(active)}>
                          {item.symbol}
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <LegalLinks className="border-t border-[var(--km-color-border)] px-3 pt-3 pb-1 text-sm text-[var(--km-color-text-secondary)]" />
            </div>
          </details>
        </li>
      </ul>
    </nav>
  );
}
