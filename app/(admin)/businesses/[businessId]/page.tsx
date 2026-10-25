import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RaiseFlagForm } from "@/components/admin/flag-forms";
import { Notice } from "@/components/admin/notices";
import { ReasonSheet, type SheetFlag } from "@/components/admin/reason-sheet";
import { ServiceErrorState } from "@/components/feedback/service-state";
import {
  Badge,
  Breadcrumbs,
  DataTable,
  KeyValueGrid,
  PageHeader,
  Panel,
  StateBanner,
} from "@/components/ui/primitives";
import { CALENDAR_DAYS } from "@/lib/admin/r16-messages";
import { LEVEL_LABELS, REASON_LABELS } from "@/lib/admin/r16-rules";
import { coreIdSchema } from "@/lib/admin/r16-schemas";
import { requireAdmin } from "@/lib/auth/server";
import {
  formatBusinessDay,
  formatDateTime,
  formatNumber,
  formatPesos,
  titleCase,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "Business",
};

/**
 * One business (spec §5.3). With no live access: the reason sheet. With
 * one: the Summary (counts and day totals, no customer or staff names),
 * "Raise a flag", and "Open records", which is a new access with its own
 * reason and evidence (never inherited, OQ16).
 */
/**
 * The design pass (Oct 24, Admin Summary; the health pills approved word for word): each health count with its word,
 * "0 none" in green, "N look closer" in amber; never red, never colour alone.
 */
function HealthCount({ count }: { count: number }) {
  return count === 0 ? (
    <Badge label={`${formatNumber(count)} none`} tone="success" value="none" />
  ) : (
    <Badge
      label={`${formatNumber(count)} look closer`}
      tone="warning"
      value="look_closer"
    />
  );
}

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ open?: string; level?: string; notice?: string }>;
}) {
  const { businessId: rawId } = await params;
  const id = coreIdSchema.safeParse(rawId);
  if (!id.success) notFound();
  const businessId = id.data;
  const query = await searchParams;
  const { service, state } = await requireAdmin(
    "businesses:read",
    `/businesses/${businessId}`,
  );
  const live = state.accesses.filter(
    (access) => access.businessId === businessId,
  );
  const records = live.find((access) => access.level === "records");
  const requestId = crypto.randomUUID();

  if (live.length === 0) {
    // No access yet: the sheet. The flag picker needs this business's open
    // flags (km_admin_flags, a directory-level read that Core logs).
    const flags = await service.listFlags({ status: null });
    const own = flags.ok
      ? flags.data.filter((flag) => flag.businessId === businessId)
      : [];
    const name = own[0]?.businessName ?? null;
    const label = name ?? `Business ${businessId.slice(0, 8)}`;
    return (
      <div className="admin-page">
        <Breadcrumbs
          items={[{ label: "Businesses", href: "/businesses" }, { label }]}
        />
        <PageHeader
          description={`Business ID ${businessId}. Nothing about it is shown until you open an access with a reason.`}
          eyebrow="Open an access"
          title={label}
        />
        <Notice value={query.notice} />
        <Panel
          boxed
          className="max-w-3xl"
          description="Summary shows counts and day totals. Records are break-glass: they need an open flag of this business or a reference."
          title="Reason sheet"
        >
          <div className="p-5">
            <ReasonSheet
              businessId={businessId}
              businessLabel={label}
              flags={toSheetFlags(own)}
              initialLevel={query.level === "records" ? "records" : "summary"}
              levels={["summary", "records"]}
              requestId={requestId}
            />
          </div>
        </Panel>
      </div>
    );
  }

  const result = await service.getBusinessSummary(businessId);
  if (!result.ok) {
    return (
      <div className="admin-page">
        <Breadcrumbs
          items={[
            { label: "Businesses", href: "/businesses" },
            { label: "Business" },
          ]}
        />
        <PageHeader
          description="The summary could not be shown."
          eyebrow="Summary"
          title="Business"
        />
        <ServiceErrorState error={result.error} />
      </div>
    );
  }

  const summary = result.data;
  const openFlags = summary.flags.filter(
    (flag) => flag.status === "open" || flag.status === "reviewing",
  );
  const healthCounts = {
    stock_use_issues_7d: summary.health.stockUseIssues7d,
    ticket_issues_7d: summary.health.ticketIssues7d,
    problem_reports_7d: summary.health.problemReports7d,
    staff_code_failures_1d: summary.health.staffCodeFailures1d,
    correction_requests_open: summary.health.correctionRequestsOpen,
  };
  const access = live[0];

  return (
    <div className="admin-page">
      <Breadcrumbs
        items={[
          { label: "Businesses", href: "/businesses" },
          { label: summary.business.name },
        ]}
      />
      <PageHeader
        actions={
          records ? (
            <Link
              className="km-button"
              href={`/businesses/${businessId}/records`}
              prefetch={false}
            >
              Records
            </Link>
          ) : (
            <Link
              className="km-button-secondary"
              href={`/businesses/${businessId}?open=records`}
              prefetch={false}
            >
              Open records
            </Link>
          )
        }
        description={
          access
            ? `${LEVEL_LABELS[access.level]} access · reason: ${REASON_LABELS[access.reasonCode]} · ends ${formatDateTime(access.expiresAt)}`
            : "Summary"
        }
        eyebrow="Summary"
        title={summary.business.name}
      />
      <Notice value={query.notice} />

      {query.open === "records" && !records ? (
        <Panel
          boxed
          className="mb-6 max-w-3xl"
          description="Records are a new access with their own reason and evidence; the summary's access is never stretched to cover them."
          title="Open records (break-glass)"
        >
          <div className="p-5">
            <ReasonSheet
              businessId={businessId}
              businessLabel={summary.business.name}
              flags={toSheetFlags(openFlags)}
              initialLevel="records"
              levels={["records"]}
              requestId={requestId}
            />
          </div>
        </Panel>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Panel title="Business">
          <KeyValueGrid
            items={[
              {
                label: "Created",
                value: formatBusinessDay(summary.business.createdOn),
              },
              { label: "Timezone", value: summary.business.timezone },
              {
                label: "State",
                value: summary.business.hiddenSince
                  ? `Hidden since ${formatDateTime(summary.business.hiddenSince)}`
                  : "Live",
              },
              { label: "Stalls", value: formatNumber(summary.stalls.length) },
              { label: "Staff", value: formatNumber(summary.staffCount) },
              {
                label: "Tickets",
                value: titleCase(summary.settings.ticketMode),
              },
              {
                label: "Owner PIN",
                value: summary.settings.ownerPinSet ? "Set" : "Not set",
              },
              {
                label: "Payment QR codes",
                value: formatNumber(summary.settings.paymentQrCount),
              },
            ]}
          />
          {summary.stalls.length > 0 ? (
            <p className="km-panel-x pb-5 text-sm text-[var(--km-color-text-secondary)]">
              Stalls: {summary.stalls.map((stall) => stall.name).join(", ")}
            </p>
          ) : null}
        </Panel>

        {/* The design pass (Adm Site canvas, Summary): each count a row, its label left and its pill right. */}
        <Panel
          description="Counts from each record's own time; a lead for a flag, never proof."
          title="Health"
        >
          <ul className="km-panel-x pb-1">
            {(
              [
                ["Stock-use issues, 7 days", summary.health.stockUseIssues7d],
                ["Ticket issues, 7 days", summary.health.ticketIssues7d],
                ["Problem reports, 7 days", summary.health.problemReports7d],
                [
                  "Staff code failures, 1 day",
                  summary.health.staffCodeFailures1d,
                ],
                [
                  "Open correction requests",
                  summary.health.correctionRequestsOpen,
                ],
              ] as const
            ).map(([label, count]) => (
              <li
                className="flex min-h-12 items-center justify-between gap-3 border-t border-[var(--km-color-border)] py-2 text-[0.9375rem] first:border-t-0"
                key={label}
              >
                <span>{label}</span>
                <HealthCount count={count} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel
        className="mt-6"
        description={`${CALENDAR_DAYS} Voided sales are left out; returns count on the day they were made.`}
        title="The last 14 days"
      >
        <DataTable label="Daily totals" layout="sticky" minWidth="40rem">
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Sales</th>
              <th scope="col">Sales total</th>
              <th scope="col">Returns</th>
              <th scope="col">Returns total</th>
            </tr>
          </thead>
          <tbody>
            {summary.days.map((day) => (
              <tr key={day.day}>
                <td className="whitespace-nowrap">
                  {formatBusinessDay(day.day)}
                </td>
                <td className="num">{formatNumber(day.salesCount)}</td>
                <td className="money">{formatPesos(day.salesCents)}</td>
                <td className="num">{formatNumber(day.returnsCount)}</td>
                <td className="money">{formatPesos(day.returnsCents)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
        <Panel title="Apps with access">
          {summary.apps.length === 0 ? (
            <p className="km-panel-x py-4 text-sm text-[var(--km-color-text-secondary)]">
              No app has access.
            </p>
          ) : (
            // The design pass: each app a row, its initial, its name, then its scope and since when.
            <ul className="divide-y divide-[var(--km-color-border)]">
              {summary.apps.map((app) => (
                <li
                  className="km-panel-x flex min-h-14 items-center gap-3 py-2.5"
                  key={`${app.grantee}-${app.scope}`}
                >
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--km-color-muted)] text-sm font-bold"
                  >
                    {app.grantee.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <strong className="block font-semibold">
                      {app.grantee}
                    </strong>
                    <span className="block text-[0.8125rem] text-[var(--km-color-text-secondary)]">
                      {app.scope} · since {formatDateTime(app.since)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* The design pass (the canvas's Flags card): the flags, then "Raise a flag" in the same card. */}
        <Panel
          description="A lead, not proof. Never shown to the business."
          title="Flags"
        >
          {summary.flags.length === 0 ? (
            <p className="km-panel-x py-4 text-sm text-[var(--km-color-text-secondary)]">
              No flags.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--km-color-border)]">
              {summary.flags.map((flag) => (
                <li
                  className="km-panel-x flex flex-wrap items-center gap-3 py-3 text-sm"
                  key={flag.flagId}
                >
                  {/* As on Flags (the pass-2 review): open or reviewing in the warning tone, with its word. */}
                  <Badge
                    tone={
                      flag.status === "open" || flag.status === "reviewing"
                        ? "warning"
                        : undefined
                    }
                    value={flag.status}
                  />
                  <span>
                    {titleCase(flag.kind)} · from {flag.source} ·{" "}
                    {formatDateTime(flag.createdAt)}
                  </span>
                  <span className="km-lead">A lead, not proof</span>
                </li>
              ))}
            </ul>
          )}
          <div className="km-panel-x border-t border-[var(--km-color-border)] pt-4 pb-5">
            <h3 className="mb-3 text-[0.9375rem] font-bold">Raise a flag</h3>
            <RaiseFlagForm
              businessId={businessId}
              healthCounts={healthCounts}
              requestId={requestId}
            />
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <StateBanner tone="info" title="Read-only">
          {" "}
          Nothing here changes the business. When you are done, close the access
          from the banner above.
        </StateBanner>
      </div>
    </div>
  );
}

function toSheetFlags(
  flags: ReadonlyArray<{
    flagId: string;
    kind: SheetFlag["kind"];
    status: string;
    createdAt: string;
  }>,
): SheetFlag[] {
  return flags.flatMap((flag) =>
    flag.status === "open" || flag.status === "reviewing"
      ? [
          {
            flagId: flag.flagId,
            kind: flag.kind,
            status: flag.status,
            createdAt: flag.createdAt,
          },
        ]
      : [],
  );
}
