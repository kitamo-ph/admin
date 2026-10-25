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
      {/* The design pass (Adm Site canvas, Flags): the filters as 44 px chips that wrap; the chosen one in ink,
          the others keep the 3:1 control edge (ds-06). */}
      <nav aria-label="Flag filters" className="mb-5 flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => (
          <Link
            aria-current={filter.status === status ? "page" : undefined}
            className="km-chip"
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
        // The design pass: one column of flag cards (the canvas's 760 px): the pills, the flag, its evidence as
        // tiles, then the review. The details no longer stretch beside a taller review form.
        <ul className="grid max-w-[47.5rem] gap-4">
          {result.data.map((flag) => (
            <li key={flag.flagId}>
              {/* The canvas boxes a flag at every width. */}
              <Panel boxed>
                <div className="grid gap-4 p-4 sm:p-5">
                  <div className="grid content-start gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* The pass-2 review (the canvas): an open or reviewing flag in the warning tone, with
                          its word, so it stands apart from the grey "A lead, not proof". */}
                      <Badge
                        tone={
                          flag.status === "open" || flag.status === "reviewing"
                            ? "warning"
                            : undefined
                        }
                        value={flag.status}
                      />
                      <span className="km-lead">A lead, not proof</span>
                    </div>
                    <h2 className="text-xl leading-tight font-bold">
                      {titleCase(flag.kind)} ·{" "}
                      {/* The pass-2 review (ds-11): a 44 px target. */}
                      <Link
                        className="inline-flex min-h-11 items-center underline underline-offset-4"
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
      <div className="mt-5 max-w-[47.5rem]">
        <StateBanner tone="info" title="Flags never act alone">
          Opening records because of a flag still needs a reason sheet, and the
          business sees that check.
        </StateBanner>
      </div>
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
  // The design pass (the canvas's evidence tiles): each piece a small tile, its name over its value.
  return (
    <dl className="grid grid-cols-2 gap-2 text-sm">
      {evidence.check ? (
        <EvidenceTile label="Check" value={evidence.check} />
      ) : null}
      {counts.map(([key, value]) => (
        <EvidenceTile
          key={key}
          label={titleCase(key)}
          value={formatNumber(value)}
        />
      ))}
      {evidence.record_ids?.length ? (
        <EvidenceTile
          label="Records named"
          value={formatNumber(evidence.record_ids.length)}
        />
      ) : null}
    </dl>
  );
}

function EvidenceTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-[var(--km-color-muted)] px-3 py-2.5">
      <dt className="text-xs font-semibold text-[var(--km-color-text-secondary)]">
        {label}
      </dt>
      <dd className="text-[0.9375rem] font-semibold break-words">{value}</dd>
    </div>
  );
}
