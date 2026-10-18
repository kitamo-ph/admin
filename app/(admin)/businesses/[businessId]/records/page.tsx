import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReasonSheet } from "@/components/admin/reason-sheet";
import { ServiceErrorState } from "@/components/feedback/service-state";
import {
  Breadcrumbs,
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  StateBanner,
} from "@/components/ui/primitives";
import { CALENDAR_DAYS } from "@/lib/admin/r16-messages";
import {
  coreIdSchema,
  recordsKindSchema,
  type RecordsKind,
  type RecordsPage,
} from "@/lib/admin/r16-schemas";
import { requireAdmin } from "@/lib/auth/server";
import {
  businessToday,
  formatBusinessDay,
  formatDateTime,
  formatNumber,
  formatPesos,
  shiftDay,
  titleCase,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "Records",
};

const TABS: { kind: RecordsKind; label: string }[] = [
  { kind: "sales", label: "Sales" },
  { kind: "credit", label: "Credit" },
  { kind: "staff", label: "Staff" },
  { kind: "audit", label: "Audit" },
];

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Records (spec §5.3): break-glass, read-only, behind a live records access
 * of their own. Sales and Audit take a window of at most 31 days; each read
 * is logged by Core with the number of rows.
 */
export default async function RecordsPageView({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ kind?: string; from?: string; to?: string }>;
}) {
  const { businessId: rawId } = await params;
  const id = coreIdSchema.safeParse(rawId);
  if (!id.success) notFound();
  const businessId = id.data;
  const query = await searchParams;
  const { service, state } = await requireAdmin(
    "businesses:read",
    `/businesses/${businessId}/records`,
  );
  const access = state.accesses.find(
    (candidate) =>
      candidate.businessId === businessId && candidate.level === "records",
  );
  const name =
    state.accesses.find((candidate) => candidate.businessId === businessId)
      ?.businessName ?? `Business ${businessId.slice(0, 8)}`;

  if (access === undefined) {
    const flags = await service.listFlags({ status: null });
    const own = flags.ok
      ? flags.data.filter((flag) => flag.businessId === businessId)
      : [];
    return (
      <div className="admin-page">
        <Breadcrumbs
          items={[
            { label: "Businesses", href: "/businesses" },
            { label: name, href: `/businesses/${businessId}` },
            { label: "Records" },
          ]}
        />
        <PageHeader
          description="Records need a records access of their own: a reason, and an open flag of this business or a reference."
          eyebrow="Records"
          title={name}
        />
        <Panel className="max-w-3xl" title="Open records (break-glass)">
          <div className="p-5">
            <ReasonSheet
              businessId={businessId}
              businessLabel={name}
              flags={own.flatMap((flag) =>
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
              )}
              initialLevel="records"
              levels={["records"]}
              requestId={crypto.randomUUID()}
            />
          </div>
        </Panel>
      </div>
    );
  }

  const kindParse = recordsKindSchema.safeParse(query.kind ?? "sales");
  const kind: RecordsKind = kindParse.success ? kindParse.data : "sales";
  const dated = kind === "sales" || kind === "audit";
  const today = businessToday();
  const to = query.to && DAY.test(query.to) ? query.to : today;
  const from =
    query.from && DAY.test(query.from) ? query.from : shiftDay(to, -6);
  const windowError = !dated
    ? null
    : from > to
      ? "The start is after the end."
      : to > today
        ? "The window cannot end in the future."
        : shiftDay(from, 30) < to
          ? "Pick at most 31 days."
          : null;

  const result =
    windowError === null
      ? await service.getBusinessRecords({
          businessId,
          kind,
          from: dated ? from : null,
          to: dated ? to : null,
        })
      : null;

  return (
    <div className="admin-page">
      <Breadcrumbs
        items={[
          { label: "Businesses", href: "/businesses" },
          { label: name, href: `/businesses/${businessId}` },
          { label: "Records" },
        ]}
      />
      <PageHeader
        description="Read-only. Every read is logged with its row count and shown to the business as a check."
        eyebrow="Records (break-glass)"
        title={name}
      />

      <nav aria-label="Record kinds" className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            aria-current={tab.kind === kind ? "page" : undefined}
            className={
              tab.kind === kind
                ? "km-button km-button-small"
                : "km-button-secondary km-button-small"
            }
            href={`/businesses/${businessId}/records?kind=${tab.kind}`}
            key={tab.kind}
            prefetch={false}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {dated ? (
        <form
          className="mb-5 flex flex-wrap items-end gap-3 rounded-[var(--km-radius-surface)] border border-[var(--km-color-border)] bg-[var(--km-color-surface)] p-4"
          method="get"
        >
          <input name="kind" type="hidden" value={kind} />
          <label className="km-label">
            From
            <input
              className="control km-input"
              defaultValue={from}
              max={today}
              name="from"
              type="date"
            />
          </label>
          <label className="km-label">
            To
            <input
              className="control km-input"
              defaultValue={to}
              max={today}
              name="to"
              type="date"
            />
          </label>
          <button className="km-button" type="submit">
            Show
          </button>
          <p className="km-hint w-full">
            At most 31 days, not in the future. {CALENDAR_DAYS}
          </p>
        </form>
      ) : null}

      {windowError !== null ? (
        <StateBanner title="Change the dates" tone="danger">
          {windowError}
        </StateBanner>
      ) : result === null ? null : !result.ok ? (
        <ServiceErrorState error={result.error} />
      ) : (
        <>
          {result.data.more ? (
            <StateBanner title="200 shown; narrow the dates" tone="warning">
              There are more records in this window than one read returns.
            </StateBanner>
          ) : null}
          <Panel
            title={TABS.find((tab) => tab.kind === kind)?.label ?? "Records"}
          >
            <RecordsTable page={result.data} />
          </Panel>
        </>
      )}
    </div>
  );
}

function RecordsTable({ page }: { page: RecordsPage }) {
  if (page.rows.length === 0) {
    return (
      <EmptyState description="Nothing in this window." title="No records" />
    );
  }
  switch (page.kind) {
    case "sales":
      return (
        <DataTable label="Sales" minWidth="64rem">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">No.</th>
              <th scope="col">Amount</th>
              <th scope="col">Discount</th>
              <th scope="col">Paid by</th>
              <th scope="col">Lines</th>
              <th scope="col">Customer</th>
              <th scope="col">Recorded by</th>
              <th scope="col">Void / return</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row) => (
              <tr key={row.saleId}>
                <td>{formatDateTime(row.happenedAt)}</td>
                <td>{row.transactionNo ?? "—"}</td>
                <td className="money">{formatPesos(row.amountCents)}</td>
                <td className="money">{formatPesos(row.discountCents)}</td>
                <td>{titleCase(row.paymentMethod)}</td>
                <td>{formatNumber(row.lineCount)}</td>
                <td>{row.customerName ?? "—"}</td>
                <td>{row.recordedByLabel ?? "—"}</td>
                <td>
                  {row.voidedAt
                    ? `Voided ${formatDateTime(row.voidedAt)}`
                    : row.returnKind
                      ? `${titleCase(row.returnKind)} ${row.returnCents === null ? "" : formatPesos(row.returnCents)}`
                      : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      );
    case "credit":
      return (
        <DataTable label="Credit" minWidth="40rem">
          <thead>
            <tr>
              <th scope="col">Customer</th>
              <th scope="col">Balance</th>
              <th scope="col">Oldest unpaid</th>
              <th scope="col">Last payment</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row) => (
              <tr key={row.customerId}>
                <td>{row.name}</td>
                <td className="money">{formatPesos(row.balanceCents)}</td>
                <td>{formatBusinessDay(row.oldestUnpaidOn)}</td>
                <td>
                  {row.lastPaymentAt
                    ? formatDateTime(row.lastPaymentAt)
                    : "None"}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      );
    case "staff":
      return (
        <DataTable label="Staff" minWidth="48rem">
          <thead>
            <tr>
              <th scope="col">Label</th>
              <th scope="col">Stalls</th>
              <th scope="col">Powers</th>
              <th scope="col">Added</th>
              <th scope="col">Ended</th>
              <th scope="col">Last session</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row) => (
              <tr key={row.staffMemberId}>
                <td>{row.label}</td>
                <td>{formatNumber(row.stallIds.length)}</td>
                <td>{row.powers.join(", ")}</td>
                <td>{formatDateTime(row.createdAt)}</td>
                <td>{row.endedAt ? formatDateTime(row.endedAt) : "—"}</td>
                <td>
                  {row.lastSessionAt
                    ? formatDateTime(row.lastSessionAt)
                    : "Never"}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      );
    case "audit":
      return (
        <DataTable label="Audit" minWidth="40rem">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Trail</th>
              <th scope="col">What</th>
              <th scope="col">By</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row, index) => (
              <tr key={`${row.at}-${index}`}>
                <td>{formatDateTime(row.at)}</td>
                <td>{titleCase(row.source)}</td>
                <td>{titleCase(row.kind)}</td>
                <td>{row.actorLabel ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      );
  }
}
