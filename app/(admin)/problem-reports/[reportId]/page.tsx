import type { Metadata } from "next";
import Link from "next/link";

import { ServiceErrorState } from "@/components/feedback/service-state";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Badge,
  Breadcrumbs,
  KeyValueGrid,
  PageHeader,
  Panel,
  StateBanner,
} from "@/components/ui/primitives";
import { getAdminService } from "@/lib/admin";
import { hasPermission } from "@/lib/auth";
import { requireAdminPermission } from "@/lib/auth/server";
import { formatDateTime, shortenId, titleCase } from "@/lib/format";

import { updateProblemReportAction } from "./actions";

export const metadata: Metadata = {
  title: "Problem report details",
};

type DetailSearchParams = {
  updated?: string;
  error?: string;
  correlation?: string;
};

export default async function ProblemReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<DetailSearchParams>;
}) {
  const { reportId } = await params;
  const query = await searchParams;
  const session = await requireAdminPermission(
    "problem_reports:read",
    `/problem-reports/${reportId}`,
  );
  const service = getAdminService();
  const [result, administratorsResult] = await Promise.all([
    service.getProblemReport(reportId),
    service.listAdministrators({ status: "active", limit: 100 }),
  ]);

  if (!result.ok) {
    return (
      <div className="admin-page">
        <Breadcrumbs
          items={[
            { label: "Problem reports", href: "/problem-reports" },
            { label: "Report details" },
          ]}
        />
        <ServiceErrorState error={result.error} />
      </div>
    );
  }

  const detail = result.data;
  const report = detail.report;
  const canUpdate = hasPermission(session.role, "problem_reports:update");
  const administrators = administratorsResult.ok
    ? administratorsResult.data.items
    : [];

  return (
    <div className="admin-page">
      <Breadcrumbs
        items={[
          { label: "Problem reports", href: "/problem-reports" },
          { label: report.id },
        ]}
      />
      <PageHeader
        actions={
          <>
            <Badge value={report.severity} />
            <Badge value={report.status} />
          </>
        }
        description={`${titleCase(report.category)} · Submitted ${formatDateTime(report.submittedAt)}`}
        eyebrow="Problem report"
        title={report.title}
      />

      {query.updated === "1" ? (
        <StateBanner tone="success" title="Report updated">
          The mock workflow change was validated and a new append-only audit
          event was recorded.
        </StateBanner>
      ) : null}
      {query.error ? (
        <StateBanner tone="danger" title="Update not recorded">
          The request failed safely ({titleCase(query.error)}). No report fields
          were changed.
          {query.correlation ? (
            <>
              {" "}
              Correlation ID: <code>{query.correlation}</code>
            </>
          ) : null}
        </StateBanner>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <div className="grid content-start gap-5">
          <Panel title="Report summary">
            <div className="p-5">
              <p className="leading-7 text-[var(--km-color-text)]">
                {report.description}
              </p>
            </div>
            <KeyValueGrid
              items={[
                {
                  label: "Issue category",
                  value: titleCase(report.category),
                },
                { label: "Severity", value: <Badge value={report.severity} /> },
                { label: "Status", value: <Badge value={report.status} /> },
                {
                  label: "Assigned administrator",
                  value: report.assignedAdminName ?? "Unassigned",
                },
                {
                  label: "Last updated",
                  value: formatDateTime(report.updatedAt),
                },
                {
                  label: "App version",
                  value: report.appVersionName,
                },
              ]}
            />
          </Panel>

          <Panel
            description="Support context; merchant financial data is excluded"
            title="Related context"
          >
            <KeyValueGrid
              items={[
                {
                  label: "Reporting user",
                  value: (
                    <Link
                      className="text-[var(--km-color-text)] hover:underline"
                      href={`/users/${detail.user.id}`}
                    >
                      {detail.user.displayName}
                    </Link>
                  ),
                },
                {
                  label: "Business",
                  value: (
                    <Link
                      className="text-[var(--km-color-text)] hover:underline"
                      href={`/businesses/${detail.business.id}`}
                    >
                      {detail.business.name}
                    </Link>
                  ),
                },
                {
                  label: "Device",
                  value: detail.device
                    ? `${detail.device.manufacturer} ${detail.device.model}`
                    : "No device attached",
                },
                {
                  label: "Device identifier",
                  value:
                    detail.device?.deviceIdentifierMasked ?? "Not recorded",
                },
                {
                  label: "Android version",
                  value: detail.device?.androidVersion ?? "Not recorded",
                },
                {
                  label: "Related sync event",
                  value: detail.relatedSyncEvent ? (
                    <div className="flex items-center gap-2">
                      <code>
                        {shortenId(detail.relatedSyncEvent.correlationId)}
                      </code>
                      <CopyButton
                        value={detail.relatedSyncEvent.correlationId}
                      />
                    </div>
                  ) : (
                    "None"
                  ),
                },
              ]}
            />
          </Panel>

          <Panel
            description="Visible only to administrators; not user-facing"
            title="Internal notes"
          >
            {report.internalNotes.length === 0 ? (
              <div className="p-5 text-sm text-[var(--km-color-text-secondary)]">
                No internal notes have been added.
              </div>
            ) : (
              <ol className="divide-y divide-[var(--km-color-border)]">
                {report.internalNotes.map((note) => (
                  <li className="p-5" key={note.id}>
                    <p className="leading-6 text-[var(--km-color-text)]">
                      {note.body}
                    </p>
                    <p className="mt-2 text-xs text-[var(--km-color-text-secondary)]">
                      {note.authorName} · {formatDateTime(note.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Resolution summary">
            <p className="p-5 leading-6 text-[var(--km-color-text-secondary)]">
              {report.resolution ?? "No resolution summary has been recorded."}
            </p>
          </Panel>
        </div>

        <aside className="self-start xl:sticky xl:top-20">
          {canUpdate ? (
            <Panel
              description="Non-destructive mock workflow"
              title="Update report"
            >
              <form
                action={updateProblemReportAction}
                className="grid gap-4 p-5"
              >
                <input name="reportId" type="hidden" value={report.id} />
                <label className="grid gap-1.5 text-sm font-semibold text-[var(--km-color-text)]">
                  Status
                  <select
                    className="control w-full"
                    defaultValue={report.status}
                    name="status"
                  >
                    {[
                      "new",
                      "triaged",
                      "in_progress",
                      "waiting_for_user",
                      "resolved",
                      "closed",
                    ].map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-[var(--km-color-text)]">
                  Severity
                  <select
                    className="control w-full"
                    defaultValue={report.severity}
                    name="severity"
                  >
                    {["low", "medium", "high", "critical"].map((severity) => (
                      <option key={severity} value={severity}>
                        {titleCase(severity)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-[var(--km-color-text)]">
                  Assigned administrator
                  <select
                    className="control w-full"
                    defaultValue={report.assignedAdminId ?? ""}
                    name="assignedAdminId"
                  >
                    <option value="">Unassigned</option>
                    {administrators.map((administrator) => (
                      <option key={administrator.id} value={administrator.id}>
                        {administrator.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-[var(--km-color-text)]">
                  Internal note
                  <textarea
                    className="control min-h-24 w-full resize-y"
                    maxLength={2000}
                    name="internalNote"
                    placeholder="Optional administrator-only note"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-[var(--km-color-text)]">
                  Resolution summary
                  <textarea
                    className="control min-h-20 w-full resize-y"
                    defaultValue={report.resolution ?? ""}
                    maxLength={2000}
                    name="resolution"
                    placeholder="Optional resolution context"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-[var(--km-color-text)]">
                  Reason
                  <textarea
                    className="control min-h-20 w-full resize-y"
                    maxLength={1000}
                    minLength={3}
                    name="reason"
                    placeholder="Required reason for the audit log"
                    required
                  />
                </label>
                <button
                  className="min-h-11 rounded-lg bg-[var(--km-color-action)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--km-color-action-hover)]"
                  type="submit"
                >
                  Update report
                </button>
                <p className="text-xs leading-5 text-[var(--km-color-text-secondary)]">
                  This mock action creates an audit event. It does not notify
                  the user or alter merchant records.
                </p>
              </form>
            </Panel>
          ) : (
            <Panel title="Read-only access">
              <div className="p-5">
                <Badge label="No mutation permission" value="read_only" />
                <p className="mt-3 text-sm leading-6 text-[var(--km-color-text-secondary)]">
                  Your role can investigate this report but cannot change its
                  workflow state, assignment, notes, or resolution.
                </p>
              </div>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}
