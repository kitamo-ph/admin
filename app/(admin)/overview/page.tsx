import type { Metadata } from "next";
import Link from "next/link";

import { ServiceErrorState } from "@/components/feedback/service-state";
import { MetricCard, PageHeader, Panel } from "@/components/ui/primitives";
import { LEVEL_LABELS, REASON_LABELS } from "@/lib/admin/r16-rules";
import { requireAdmin } from "@/lib/auth/server";
import { formatDateTime, formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Overview",
};

/** Overview (spec §5.3): km_admin_directory's totals, counts only. */
export default async function OverviewPage() {
  const { service, state } = await requireAdmin("overview:read", "/overview");
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
        <section
          aria-label="Business counts"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          <MetricCard
            context="Every business KitaMo holds"
            icon="B"
            label="Businesses"
            value={formatNumber(result.data.totals.businesses)}
          />
          <MetricCard
            context="Not hidden by their owner"
            icon="L"
            label="Live"
            tone="success"
            value={formatNumber(result.data.totals.live)}
          />
          <MetricCard
            context="Hidden by their owner"
            icon="H"
            label="Hidden"
            value={formatNumber(result.data.totals.hidden)}
          />
          <MetricCard
            context="With a sale in the last 7 days"
            icon="7"
            label="Active this week"
            value={formatNumber(result.data.totals.active7d)}
          />
          <MetricCard
            context="Open or under review; a lead, not proof"
            icon="F"
            label="With open flags"
            tone={result.data.totals.withOpenFlags > 0 ? "warning" : "default"}
            value={formatNumber(result.data.totals.withOpenFlags)}
          />
        </section>
      ) : (
        <ServiceErrorState error={result.error} />
      )}

      <Panel
        className="mt-6"
        description="Each lasts 30 minutes from when it was opened. Close it when you are done."
        title="Your open accesses"
      >
        {state.accesses.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[var(--km-color-text-secondary)]">
            None open. Every look at a business starts with a reason.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--km-color-border)]">
            {state.accesses.map((access) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                key={access.accessId}
              >
                <Link
                  className="font-semibold underline underline-offset-4"
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
