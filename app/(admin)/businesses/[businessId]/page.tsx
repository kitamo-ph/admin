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

      <div className="grid gap-6 xl:grid-cols-2">
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
            <p className="px-5 pb-5 text-sm text-[var(--km-color-text-secondary)]">
              Stalls: {summary.stalls.map((stall) => stall.name).join(", ")}
            </p>
          ) : null}
        </Panel>

        <Panel
          description="Counts from each record's own time; a lead for a flag, never proof."
          title="Health"
        >
          <KeyValueGrid
            items={[
              {
                label: "Stock-use issues, 7 days",
                value: formatNumber(summary.health.stockUseIssues7d),
              },
              {
                label: "Ticket issues, 7 days",
                value: formatNumber(summary.health.ticketIssues7d),
              },
              {
                label: "Problem reports, 7 days",
                value: formatNumber(summary.health.problemReports7d),
              },
              {
                label: "Staff code failures, 1 day",
                value: formatNumber(summary.health.staffCodeFailures1d),
              },
              {
                label: "Open correction requests",
                value: formatNumber(summary.health.correctionRequestsOpen),
              },
            ]}
          />
        </Panel>
      </div>

      <Panel
        className="mt-6"
        description={`${CALENDAR_DAYS} Voided sales are left out; returns count on the day they were made.`}
        title="The last 14 days"
      >
        <DataTable label="Daily totals" minWidth="40rem">
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
                <td>{formatBusinessDay(day.day)}</td>
                <td>{formatNumber(day.salesCount)}</td>
                <td className="money">{formatPesos(day.salesCents)}</td>
                <td>{formatNumber(day.returnsCount)}</td>
                <td className="money">{formatPesos(day.returnsCents)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Apps with access">
          {summary.apps.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[var(--km-color-text-secondary)]">
              No app has access.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--km-color-border)]">
              {summary.apps.map((app) => (
                <li
                  className="px-5 py-3 text-sm"
                  key={`${app.grantee}-${app.scope}`}
                >
                  <strong>{app.grantee}</strong> · {app.scope} · since{" "}
                  {formatDateTime(app.since)}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          description="A lead, not proof. Never shown to the business."
          title="Flags"
        >
          {summary.flags.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[var(--km-color-text-secondary)]">
              No flags.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--km-color-border)]">
              {summary.flags.map((flag) => (
                <li
                  className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"
                  key={flag.flagId}
                >
                  <Badge value={flag.status} />
                  <span>
                    {titleCase(flag.kind)} · from {flag.source} ·{" "}
                    {formatDateTime(flag.createdAt)}
                  </span>
                  <span className="km-lead">A lead, not proof</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="mt-6 max-w-3xl" title="Raise a flag">
        <div className="p-5">
          <RaiseFlagForm
            businessId={businessId}
            healthCounts={healthCounts}
            requestId={requestId}
          />
        </div>
      </Panel>

      <StateBanner tone="info" title="Read-only">
        Nothing here changes the business. When you are done, close the access
        from the banner above.
      </StateBanner>
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
