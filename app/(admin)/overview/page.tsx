import type { Metadata } from "next";
import Link from "next/link";

import { LiveHiddenBar } from "@/components/admin/live-hidden-bar";
import { ServiceErrorState } from "@/components/feedback/service-state";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { LEVEL_LABELS, REASON_LABELS } from "@/lib/admin/r16-rules";
import { hasPermission } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth/server";
import { formatDateTime, formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Overview",
};

/** The canvas's tile icons (24 px strokes). */
const ICONS = {
  live: "M5 12.5l4.5 4.5L19 7.5",
  hidden: "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zM4 4l16 16",
  active: "M4 17l5-5 4 4 7-7",
  flags: "M5 21V4M5 4h11l-2 4 2 4H5",
} as const;

const TILE_TONES = {
  success: "bg-[var(--km-color-success-soft)] text-[var(--km-color-success)]",
  warning:
    "bg-[var(--km-color-warning-soft)] text-[var(--km-color-warning-ink)]",
  muted: "bg-[var(--km-color-muted)] text-[var(--km-color-text-secondary)]",
} as const;

/**
 * One count (the canvas's Simple tile on a phone, its Pro column on a laptop): the label, the figure, its
 * sentence and, on "With open flags", the way to the flags (it claims no flag of its own).
 */
function CountTile({
  label,
  value,
  note,
  icon,
  tone,
  link,
}: {
  label: string;
  value: number;
  note: string;
  icon: string;
  tone: keyof typeof TILE_TONES;
  link?: { href: string; label: string };
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[var(--km-radius-surface)] border border-[var(--km-color-border)] p-4 lg:gap-0.5 lg:rounded-none lg:border-0 lg:border-t lg:px-0 lg:pt-3 lg:pb-3.5">
      <p className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={`grid size-9 shrink-0 place-items-center rounded-full lg:hidden ${TILE_TONES[tone]}`}
        >
          <svg
            fill="none"
            height="18"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.25"
            viewBox="0 0 24 24"
            width="18"
          >
            <path d={icon} />
          </svg>
        </span>
        <span className="text-[0.9375rem] font-semibold text-[var(--km-color-text)] lg:font-medium lg:text-[var(--km-color-text-secondary)]">
          {label}
        </span>
      </p>
      <p className="text-[2.125rem] leading-[1.1] font-bold tracking-[-0.02em] text-[var(--km-color-text)] lg:text-[1.75rem] lg:leading-[1.15]">
        {formatNumber(value)}
      </p>
      <p className="text-[0.8125rem] leading-[1.35] text-[var(--km-color-text-secondary)]">
        {note}
      </p>
      {link ? (
        <Link
          className="inline-flex min-h-11 items-center self-start text-[0.9375rem] font-semibold text-[var(--km-color-action)] hover:underline"
          href={link.href}
          prefetch={false}
        >
          {link.label}
        </Link>
      ) : null}
    </div>
  );
}

/** Overview (spec §5.3): km_admin_directory's totals, counts only. */
export default async function OverviewPage() {
  const { service, state, session } = await requireAdmin(
    "overview:read",
    "/overview",
  );
  const result = await service.getOverview();

  return (
    <div className="admin-page">
      <PageHeader
        description="Counts across every KitaMo business. No money, no names: open a business with a reason to see more."
        eyebrow="KitaMo admin"
        title="Overview"
        actions={
          <Link className="km-button" href="/businesses" prefetch={false}>
            Open the business directory
          </Link>
        }
      />

      {result.ok ? (
        // The design pass (Adm Site canvas, Overview): on a phone the business count leads, large, with the
        // live/hidden bar; the other counts follow as cards. On a laptop the five counts are one ruled row.
        // Every count and its sentence stay (rule 1); the bar shows only the counts above it, in words.
        <section
          aria-label="Business counts"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-x-8 lg:gap-y-0"
        >
          <div className="flex min-w-0 flex-col gap-1 sm:col-span-2 lg:col-span-1 lg:border-t lg:border-[var(--km-color-border)] lg:pt-3 lg:pb-3.5">
            <p className="text-[0.9375rem] font-medium text-[var(--km-color-text-secondary)]">
              Businesses
            </p>
            <p className="text-5xl leading-[1.05] font-bold tracking-[-0.03em] text-[var(--km-color-text)] lg:text-[1.75rem] lg:leading-[1.15] lg:tracking-[-0.01em]">
              {formatNumber(result.data.totals.businesses)}
            </p>
            <p className="text-[0.8125rem] text-[var(--km-color-text-secondary)]">
              Every business KitaMo holds
            </p>
            <div className="mt-3 max-w-[32.5rem]">
              <LiveHiddenBar
                hidden={result.data.totals.hidden}
                live={result.data.totals.live}
              />
            </div>
          </div>
          <CountTile
            icon={ICONS.live}
            label="Live"
            note="Not hidden by their owner"
            tone="success"
            value={result.data.totals.live}
          />
          <CountTile
            icon={ICONS.hidden}
            label="Hidden"
            note="Hidden by their owner"
            tone="muted"
            value={result.data.totals.hidden}
          />
          <CountTile
            icon={ICONS.active}
            label="Active this week"
            note="With a sale in the last 7 days"
            tone="success"
            value={result.data.totals.active7d}
          />
          <CountTile
            icon={ICONS.flags}
            label="With open flags"
            link={
              hasPermission(session.role, "flags:read")
                ? { href: "/flags", label: "Review flags" }
                : undefined
            }
            note="Open or under review; a lead, not proof"
            tone={result.data.totals.withOpenFlags > 0 ? "warning" : "muted"}
            value={result.data.totals.withOpenFlags}
          />
        </section>
      ) : (
        <ServiceErrorState error={result.error} />
      )}

      {/* The lead's pass-2 review: as wide as the counts row above it (was 768 px, stopping short of it). */}
      <Panel
        className="mt-8"
        description="Each lasts 30 minutes from when it was opened. Close it when you are done."
        title="Your open accesses"
      >
        {state.accesses.length === 0 ? (
          <p className="km-panel-x py-4 text-sm text-[var(--km-color-text-secondary)]">
            None open. Every look at a business starts with a reason.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--km-color-border)]">
            {state.accesses.map((access) => (
              <li
                className="km-panel-x flex flex-wrap items-center justify-between gap-x-3 py-1.5"
                key={access.accessId}
              >
                {/* The pass-2 review (ds-11): a 44 px target. */}
                <Link
                  className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                  href={`/businesses/${access.businessId}`}
                  prefetch={false}
                >
                  {access.businessName ?? "A deleted business"}
                </Link>
                <span className="text-sm text-[var(--km-color-text-secondary)]">
                  {LEVEL_LABELS[access.level]} ·{" "}
                  {REASON_LABELS[access.reasonCode]} · ends{" "}
                  {formatDateTime(access.expiresAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
