import type { Metadata } from "next";
import Link from "next/link";

import { FlagReviewForm } from "@/components/admin/flag-forms";
import { Notice } from "@/components/admin/notices";
import { ServiceErrorState } from "@/components/feedback/service-state";
import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  StateBanner,
} from "@/components/ui/primitives";
import {
  flagStatusSchema,
  type FlagEvidence,
  type FlagStatus,
} from "@/lib/admin/r16-schemas";
import { hasPermission } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth/server";
import { formatDateTime, formatNumber, titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "Flags",
};

const FILTERS: { status: FlagStatus | null; label: string }[] = [
  { status: null, label: "Open and reviewing" },
  { status: "open", label: "Open" },
  { status: "reviewing", label: "Reviewing" },
  { status: "dismissed", label: "Dismissed" },
  { status: "confirmed", label: "Confirmed" },
];

/**
 * Flags (spec §5.3, D27 §6, OQ18): leads, not proof. Never shown to the
 * business, never acted on alone. Raised by hand from a Summary in R16.
 */
export default async function FlagsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; notice?: string }>;
}) {
  const { service, session } = await requireAdmin("flags:read", "/flags");
  const query = await searchParams;
  const parsed = flagStatusSchema.safeParse(query.status);
  const status = parsed.success ? parsed.data : null;
  const result = await service.listFlags({ status });
  const canReview = hasPermission(session.role, "flags:update");
  const here = status === null ? "/flags" : `/flags?status=${status}`;

  return (
    <div className="admin-page">
      <PageHeader
        description="Flags point at a business worth a closer look. They are never shown to the business and never change anything there."
        eyebrow="Leads"
        title="Flags"
      />
      <Notice value={query.notice} />
      <nav aria-label="Flag filters" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            aria-current={filter.status === status ? "page" : undefined}
            className={
              filter.status === status
                ? "km-button km-button-small"
                : "km-button-secondary km-button-small"
            }
            href={
              filter.status === null
                ? "/flags"
                : `/flags?status=${filter.status}`
            }
            key={filter.label}
            prefetch={false}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {!result.ok ? (
        <ServiceErrorState error={result.error} />
      ) : result.data.length === 0 ? (
        <Panel>
          <EmptyState
            description="Raise a flag from a business's Summary when its counts need a closer look."
            title="No flags here"
          />
        </Panel>
      ) : (
        <ul className="grid gap-4">
          {result.data.map((flag) => (
            <li key={flag.flagId}>
              <Panel>
                <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge value={flag.status} />
                      <span className="km-lead">A lead, not proof</span>
                    </div>
                    <h2 className="text-lg font-semibold">
                      {titleCase(flag.kind)} ·{" "}
                      <Link
                        className="underline underline-offset-4"
                        href={`/businesses/${flag.businessId}`}
                        prefetch={false}
                      >
                        {flag.businessName ?? "A deleted business"}
                      </Link>
                    </h2>
                    <p className="text-sm text-[var(--km-color-text-secondary)]">
                      From {flag.source} · raised{" "}
                      {formatDateTime(flag.createdAt)}
                      {flag.closedAt
                        ? ` · closed ${formatDateTime(flag.closedAt)}`
                        : ""}
                    </p>
                    <EvidenceSummary evidence={flag.evidence} />
                  </div>
                  {canReview ? (
                    <FlagReviewForm
                      flagId={flag.flagId}
                      requestId={crypto.randomUUID()}
                      returnTo={here}
                      status={flag.status}
                    />
                  ) : null}
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
      <StateBanner tone="info" title="Flags never act alone">
        Opening records because of a flag still needs a reason sheet, and the
        business sees that check.
      </StateBanner>
    </div>
  );
}

function EvidenceSummary({ evidence }: { evidence: FlagEvidence }) {
  const counts = Object.entries(evidence.counts ?? {});
  if (counts.length === 0 && !evidence.check && !evidence.record_ids?.length) {
    return (
      <p className="text-sm text-[var(--km-color-text-secondary)]">
        No evidence attached.
      </p>
    );
  }
  return (
    <dl className="grid gap-1 text-sm">
      {evidence.check ? (
        <div className="flex gap-2">
          <dt className="font-semibold">Check</dt>
          <dd>{evidence.check}</dd>
        </div>
      ) : null}
      {counts.map(([key, value]) => (
        <div className="flex gap-2" key={key}>
          <dt className="font-semibold">{titleCase(key)}</dt>
          <dd>{formatNumber(value)}</dd>
        </div>
      ))}
      {evidence.record_ids?.length ? (
        <div className="flex gap-2">
          <dt className="font-semibold">Records named</dt>
          <dd>{formatNumber(evidence.record_ids.length)}</dd>
        </div>
      ) : null}
    </dl>
  );
}
