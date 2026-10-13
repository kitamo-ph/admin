import type { Metadata } from "next";
import Link from "next/link";

import { ServiceErrorState } from "@/components/feedback/service-state";
import {
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  StateBanner,
} from "@/components/ui/primitives";
import { LEVEL_LABELS, REASON_LABELS } from "@/lib/admin/r16-rules";
import { utcDateTimeSchema } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth/server";
import { formatDateTime, formatNumber, titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "Access log",
};

/**
 * The access log (spec §5.3, D27 §4.3): every admin's accesses and reads,
 * from Core's append-only admin_access and admin_reads.
 */
export default async function AccessLogPage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const { service } = await requireAdmin("audit_log:read", "/audit-log");
  const query = await searchParams;
  const before = utcDateTimeSchema.safeParse(query.before);
  const result = await service.listAccessLog({
    before: before.success ? before.data : null,
  });

  return (
    <div className="admin-page">
      <PageHeader
        description="Every access to a business and every read, newest first."
        eyebrow="Accountability"
        title="Access log"
      />
      <StateBanner
        tone="info"
        title="Access entries cannot be edited, hidden, or deleted."
      >
        After a business is deleted, its entries keep only ids, codes and times.
      </StateBanner>
      {!result.ok ? (
        <ServiceErrorState error={result.error} />
      ) : (
        <>
          <Panel description="Up to 100 at a time." title="Accesses">
            {result.data.accesses.length === 0 ? (
              <EmptyState
                description="No access has been opened."
                title="No accesses"
              />
            ) : (
              <DataTable label="Accesses" minWidth="72rem">
                <thead>
                  <tr>
                    <th scope="col">Opened</th>
                    <th scope="col">Admin</th>
                    <th scope="col">Business</th>
                    <th scope="col">Level</th>
                    <th scope="col">Reason</th>
                    <th scope="col">Written reason</th>
                    <th scope="col">Evidence</th>
                    <th scope="col">Ended</th>
                    <th scope="col">Disclosure held until</th>
                    <th scope="col">Reads</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.accesses.map((entry) => (
                    <tr key={entry.accessId}>
                      <td>{formatDateTime(entry.openedAt)}</td>
                      <td>{entry.adminLabel}</td>
                      <td>{entry.businessName ?? "Deleted business"}</td>
                      <td>{LEVEL_LABELS[entry.level]}</td>
                      <td>{REASON_LABELS[entry.reasonCode]}</td>
                      <td className="max-w-80 whitespace-normal">
                        {entry.reasonText ?? "Removed with the business"}
                      </td>
                      <td>
                        {entry.flagId
                          ? `Flag ${entry.flagId.slice(0, 8)}`
                          : (entry.reference ?? "—")}
                      </td>
                      <td>
                        {titleCase(entry.endedHow)}
                        {entry.endedAt
                          ? ` · ${formatDateTime(entry.endedAt)}`
                          : ""}
                      </td>
                      <td>
                        {entry.withheldUntil
                          ? formatDateTime(entry.withheldUntil)
                          : "Not held"}
                      </td>
                      <td>{formatNumber(entry.reads)}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
            {result.data.accesses.length === 100 ? (
              <div className="border-t border-[var(--km-color-border)] px-5 py-3">
                <Link
                  className="km-button-secondary km-button-small"
                  href={`/audit-log?before=${encodeURIComponent(
                    result.data.accesses[result.data.accesses.length - 1]
                      ?.openedAt ?? "",
                  )}`}
                  prefetch={false}
                >
                  Older
                </Link>
              </div>
            ) : null}
          </Panel>

          <Panel
            className="mt-6"
            description="Up to 200, newest first."
            title="Reads"
          >
            {result.data.reads.length === 0 ? (
              <EmptyState
                description="Nothing has been read yet."
                title="No reads"
              />
            ) : (
              <DataTable label="Reads" minWidth="40rem">
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">What</th>
                    <th scope="col">Business</th>
                    <th scope="col">Under access</th>
                    <th scope="col">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.reads.map((read, index) => (
                    <tr key={`${read.at}-${index}`}>
                      <td>{formatDateTime(read.at)}</td>
                      <td>
                        <code>{read.fn}</code>
                      </td>
                      <td>
                        {read.businessId
                          ? read.businessId.slice(0, 8)
                          : "Directory"}
                      </td>
                      <td>{read.accessId ? read.accessId.slice(0, 8) : "—"}</td>
                      <td>
                        {read.rowsReturned === null
                          ? "—"
                          : formatNumber(read.rowsReturned)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
