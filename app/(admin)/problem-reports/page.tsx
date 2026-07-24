import type { Metadata } from "next";
import Link from "next/link";

import {
  DataFreshness,
  ServiceErrorState,
} from "@/components/feedback/service-state";
import { FilterBar, FilterField } from "@/components/filters/filter-bar";
import {
  Badge,
  DataTable,
  EmptyState,
  PageHeader,
  PaginationControls,
  Panel,
} from "@/components/ui/primitives";
import {
  getAdminService,
  reportCategorySchema,
  reportSeveritySchema,
  reportStatusSchema,
} from "@/lib/admin";
import { requireAdminPermission } from "@/lib/auth/server";
import { formatDateTime, titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "Problem reports",
};

type ReportSearchParams = {
  q?: string;
  severity?: string;
  category?: string;
  status?: string;
  assigned?: string;
  offset?: string;
};

export default async function ProblemReportsPage({
  searchParams,
}: {
  searchParams: Promise<ReportSearchParams>;
}) {
  await requireAdminPermission("problem_reports:read", "/problem-reports");
  const query = await searchParams;
  const offset = parseOffset(query.offset);
  const service = getAdminService();

  const [reportsResult, administratorsResult] = await Promise.all([
    service.listProblemReports({
      search: query.q?.trim() || undefined,
      severity: parseEnum(reportSeveritySchema, query.severity),
      category: parseEnum(reportCategorySchema, query.category),
      status: parseEnum(reportStatusSchema, query.status),
      assignedAdminId: query.assigned || undefined,
      offset,
      limit: 25,
    }),
    service.listAdministrators({ limit: 100 }),
  ]);

  if (!reportsResult.ok) {
    return (
      <div className="admin-page">
        <PageHeader
          description="Triage fictional support issues with accountable, non-destructive workflow updates."
          eyebrow="Operations"
          title="Problem reports"
        />
        <ServiceErrorState error={reportsResult.error} />
      </div>
    );
  }

  const reports = reportsResult.data;
  const administrators = administratorsResult.ok
    ? administratorsResult.data.items
    : [];

  return (
    <div className="admin-page">
      <PageHeader
        actions={
          <DataFreshness
            generatedAt={reportsResult.meta.generatedAt}
            stale={reportsResult.meta.stale}
          />
        }
        description="Triage fictional support issues with accountable, non-destructive workflow updates."
        eyebrow="Operations"
        title="Problem reports"
      />

      <FilterBar
        resetHref="/problem-reports"
        resultLabel={`${reports.total} reports match the current filters`}
      >
        <FilterField label="Search">
          <input
            className="control w-full"
            defaultValue={query.q}
            name="q"
            placeholder="Title, user, business, device"
            type="search"
          />
        </FilterField>
        <FilterField label="Severity">
          <select
            className="control w-full"
            defaultValue={query.severity ?? ""}
            name="severity"
          >
            <option value="">All severities</option>
            {["low", "medium", "high", "critical"].map((severity) => (
              <option key={severity} value={severity}>
                {titleCase(severity)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Category">
          <select
            className="control w-full"
            defaultValue={query.category ?? ""}
            name="category"
          >
            <option value="">All categories</option>
            {[
              "synchronization",
              "account_access",
              "device_performance",
              "app_crash",
              "data_conflict",
              "other",
            ].map((category) => (
              <option key={category} value={category}>
                {titleCase(category)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Status">
          <select
            className="control w-full"
            defaultValue={query.status ?? ""}
            name="status"
          >
            <option value="">All statuses</option>
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
        </FilterField>
        <FilterField label="Assigned administrator">
          <select
            className="control w-full"
            defaultValue={query.assigned ?? ""}
            name="assigned"
          >
            <option value="">Any assignment</option>
            {administrators.map((administrator) => (
              <option key={administrator.id} value={administrator.id}>
                {administrator.displayName}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      <Panel>
        {reports.items.length === 0 ? (
          <EmptyState
            action={
              <Link
                className="font-semibold text-[#1e513d] hover:underline"
                href="/problem-reports"
              >
                Clear all filters
              </Link>
            }
            description="Try a broader title, severity, category, status, or assignment."
            title="No problem reports match"
          />
        ) : (
          <>
            <div className="hidden lg:block">
              <DataTable label="KitaMo problem reports" minWidth="82rem">
                <thead>
                  <tr>
                    <th scope="col">Report</th>
                    <th scope="col">Severity</th>
                    <th scope="col">Category</th>
                    <th scope="col">Status</th>
                    <th scope="col">User</th>
                    <th scope="col">Business</th>
                    <th scope="col">Device / version</th>
                    <th scope="col">Submitted</th>
                    <th scope="col">Assigned administrator</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.items.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <Link
                          className="font-semibold text-[#173f30] hover:underline"
                          href={`/problem-reports/${report.id}`}
                        >
                          {report.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-[#69736d]">
                          {report.internalNotes.length} internal notes
                        </p>
                      </td>
                      <td>
                        <Badge value={report.severity} />
                      </td>
                      <td>{titleCase(report.category)}</td>
                      <td>
                        <Badge value={report.status} />
                      </td>
                      <td>
                        <Link
                          className="hover:underline"
                          href={`/users/${report.userId}`}
                        >
                          {report.userName}
                        </Link>
                      </td>
                      <td>
                        <Link
                          className="hover:underline"
                          href={`/businesses/${report.businessId}`}
                        >
                          {report.businessName}
                        </Link>
                      </td>
                      <td>
                        <p className="font-mono text-xs">
                          {report.deviceIdentifierMasked ?? "No device"}
                        </p>
                        <p className="mt-0.5 text-xs text-[#69736d]">
                          v{report.appVersionName}
                        </p>
                      </td>
                      <td className="text-xs whitespace-nowrap text-[#69736d]">
                        {formatDateTime(report.submittedAt)}
                      </td>
                      <td>
                        {report.assignedAdminName ?? (
                          <span className="text-[#69736d]">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>

            <div className="divide-y divide-[#e7ebe7] lg:hidden">
              {reports.items.map((report) => (
                <article className="p-4" key={report.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        className="font-semibold text-[#173f30] hover:underline"
                        href={`/problem-reports/${report.id}`}
                      >
                        {report.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-[#69736d]">
                        {report.businessName} ·{" "}
                        {formatDateTime(report.submittedAt)}
                      </p>
                    </div>
                    <Badge value={report.severity} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge value={report.status} />
                    <Badge value={report.category} />
                  </div>
                  <p className="mt-3 text-xs text-[#69736d]">
                    Reported by {report.userName} · Assigned to{" "}
                    {report.assignedAdminName ?? "no administrator"}
                  </p>
                </article>
              ))}
            </div>
            <PaginationControls
              basePath="/problem-reports"
              limit={reports.limit}
              offset={reports.offset}
              query={{
                q: query.q,
                severity: query.severity,
                category: query.category,
                status: query.status,
                assigned: query.assigned,
              }}
              total={reports.total}
            />
          </>
        )}
      </Panel>
    </div>
  );
}

function parseOffset(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function parseEnum<T>(
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
  value: string | undefined,
): T | undefined {
  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
}
