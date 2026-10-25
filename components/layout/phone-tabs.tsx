"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PRIVACY_URL, TERMS_URL } from "./legal-links";

export type PhoneTab = { href: string; label: string; symbol: string };

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/** The KM Bottom Bar's admin icons (the design export, step 1); other sections keep their letter mark. */
const ICONS: Record<string, string> = {
  "/overview": "M4 13h4v7H4zM10 8h4v12h-4zM16 4h4v16h-4z",
  "/businesses": "M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-6h6v6",
  "/flags": "M5 21V4M5 4h11l-2 4 2 4H5",
  "/audit-log": "M6 3h12v18H6zM9 8h6M9 12h6M9 16h3",
};
const MORE_ICON = "M5 7h14M5 12h14M5 17h14";

function TabIcon({ path, symbol }: { path?: string; symbol: string }) {
  if (path === undefined) {
    return (
      <span className="text-[0.8rem] leading-none font-bold">{symbol}</span>
    );
  }
  return (
    <svg
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
    >
      <path d={path} />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0 text-[var(--km-color-text-secondary)]"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.25"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

const tabClass = (active: boolean) =>
  `flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-[3px] px-0.5 text-xs leading-tight ${
    active
      ? "font-semibold text-[var(--km-color-text)]"
      : "font-medium text-[var(--km-color-text-secondary)] hover:text-[var(--km-color-text)]"
  }`;
const pillClass = (active: boolean) =>
  `grid h-[1.875rem] w-14 shrink-0 place-items-center rounded-full ${
    active
      ? "bg-[var(--km-color-select-soft)] text-[var(--km-color-action)]"
      : ""
  }`;
const rowClass =
  "flex min-h-[3.25rem] items-center gap-3 px-3.5 text-[var(--km-color-text)] hover:bg-[var(--km-color-border)]";

/**
 * The design pass (Oct 24, Admin on a phone; KM Bottom Bar, admin variant): below the laptop width, the main
 * sections as a bottom bar (Overview, Businesses, Flags, Access log, whichever this admin may open) and More,
 * a sheet with every other section this admin may open (Associations among them) and Privacy · Terms. Sign out
 * stays in the top bar (with the idle lock, which mounts once).
 *
 * More is a <details>, so it opens without JavaScript. The bar persists across navigation, so the sheet closes
 * whenever the page changes, on Escape (back to More), on the Close button and on a tap outside it (the scrim;
 * the lead's review of 84963c8). prefetch is off, as in the sidebar (each prefetch is a Vercel invocation).
 */
export function PhoneTabs({
  tabs,
  more,
}: {
  tabs: PhoneTab[];
  more: PhoneTab[];
}) {
  const pathname = usePathname();
  const sheet = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const moreActive = more.some((item) => isActive(pathname, item.href));

  const close = () => {
    if (sheet.current) sheet.current.open = false;
  };
  const closeToMore = () => {
    close();
    summary.current?.focus();
  };

  // A new page closes the sheet: a section link inside it, the browser's back, or a link elsewhere.
  useEffect(() => {
    if (sheet.current) sheet.current.open = false;
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (sheet.current) sheet.current.open = false;
      summary.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav
      aria-label="Admin tabs"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--km-color-border)] bg-[var(--km-color-surface)] px-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] lg:hidden"
    >
      <ul className="mx-auto flex max-w-xl">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li className="flex min-w-0 flex-1" key={tab.href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={tabClass(active)}
                href={tab.href}
                prefetch={false}
              >
                <span aria-hidden="true" className={pillClass(active)}>
                  <TabIcon path={ICONS[tab.href]} symbol={tab.symbol} />
                </span>
                <span className="max-w-full truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex min-w-0 flex-1">
          <details
            className="flex min-w-0 flex-1"
            onToggle={(event) => setOpen(event.currentTarget.open)}
            ref={sheet}
          >
            <summary
              className={`${tabClass(moreActive)} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
              ref={summary}
            >
              <span aria-hidden="true" className={pillClass(moreActive)}>
                <TabIcon path={MORE_ICON} symbol="" />
              </span>
              More
            </summary>
            {/* The scrim: a tap outside the sheet closes it. Keyboard users have Escape and Close. */}
            <div
              aria-hidden="true"
              className="fixed inset-0 z-40 bg-[var(--km-color-overlay)]"
              onClick={close}
            />
            <div
              aria-labelledby="phone-more-title"
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-4rem)] flex-col gap-3 overflow-y-auto rounded-t-[var(--km-radius-sheet)] bg-[var(--km-color-surface)] px-4 pt-2 pb-[calc(1.75rem+env(safe-area-inset-bottom))] shadow-[var(--km-shadow-2)]"
              role="region"
            >
              <span
                aria-hidden="true"
                className="h-[5px] w-9 self-center rounded-full bg-[var(--km-color-border-strong)]"
              />
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold" id="phone-more-title">
                  More
                </h2>
                <button
                  aria-label="Close"
                  className="-mr-2 grid size-11 place-items-center rounded-full text-[var(--km-color-text-secondary)]"
                  onClick={closeToMore}
                  type="button"
                >
                  <span className="grid size-[1.875rem] place-items-center rounded-full bg-[var(--km-color-muted)]">
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="14"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                      width="14"
                    >
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </span>
                </button>
              </div>
              {more.length > 0 ? (
                <ul className="grid divide-y divide-[var(--km-color-border-strong)] overflow-hidden rounded-[0.875rem] bg-[var(--km-color-muted)]">
                  {more.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          aria-current={active ? "page" : undefined}
                          className={`${rowClass} ${active ? "font-semibold" : ""}`}
                          href={item.href}
                          onClick={close}
                          prefetch={false}
                        >
                          <span className="flex-1">{item.label}</span>
                          <Chevron />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {/* Privacy · Terms (R21) as full rows: 52 px targets, not 20 px inline links. */}
              <ul className="grid divide-y divide-[var(--km-color-border-strong)] overflow-hidden rounded-[0.875rem] bg-[var(--km-color-muted)]">
                <li>
                  <a className={rowClass} href={PRIVACY_URL}>
                    <span className="flex-1">Privacy</span>
                    <Chevron />
                  </a>
                </li>
                <li>
                  <a className={rowClass} href={TERMS_URL}>
                    <span className="flex-1">Terms</span>
                    <Chevron />
                  </a>
                </li>
              </ul>
            </div>
          </details>
        </li>
      </ul>
    </nav>
  );
}
