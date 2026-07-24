import type { Metadata } from "next";
import Link from "next/link";

import {
  DataFreshness,
  ServiceErrorState,
} from "@/components/feedback/service-state";
import {
  Badge,
  DataTable,
  MetricCard,
  PageHeader,
  Panel,
  StateBanner,
} from "@/components/ui/primitives";
import { getAdminService } from "@/lib/admin";
import { requireAdminPermission } from "@/lib/auth/server";
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  titleCase,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "Overview",
};

export default async function OverviewPage() {
  await requireAdminPermission("overview:read", "/overview");

  const result = await getAdminService().getDashboardSummary();
  if (!result.ok) {
    return (
      <div className="admin-page">
        <PageHeader
          description="A concise view of KitaMo platform activity, support workload, and synchronization health."
          eyebrow="Operational workspace"
          title="Overview"
        />
        <ServiceErrorState error={result.error} />
      </div>
    );
  }

  const summary = result.data;

  return (
    <div className="admin-page">
      <PageHeader
        actions={
          <DataFreshness
            generatedAt={result.meta.generatedAt}
            stale={result.meta.stale}
          />
        }
        description="A concise view of KitaMo platform activity, support workload, and synchronization health."
        eyebrow="Operational workspace"
        title="Overview"
      />

      {result.meta.stale ? (
        <StateBanner tone="warning" title="This snapshot may be out of date">
          The mock stale-data scenario is active. Use timestamps and correlation
          IDs when reviewing support issues.
        </StateBanner>
      ) : null}

      <section
        aria-label="Platform metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          context="Fictional owner and seller accounts"
          icon="U"
          label="Registered users"
          value={formatNumber(summary.registeredUsers)}
        />
        <MetricCard
          context={`${formatNumber(summary.activeStalls)} active stalls`}
          icon="B"
          label="Active businesses"
          value={formatNumber(summary.activeBusinesses)}
        />
        <MetricCard
          context="Seller devices seen in the active window"
          icon="D"
          label="Connected devices"
          value={formatNumber(summary.connectedSellerDevices)}
        />
        <MetricCard
          context={`${formatNumber(summary.syncRecordsProcessed)} records processed`}
          icon="↻"
          label="Sync success rate"
          tone={summary.syncSuccessRate >= 95 ? "success" : "warning"}
          value={formatPercent(summary.syncSuccessRate)}
        />
        <MetricCard
          context="Attempts requiring investigation or retry"
          icon="!"
          label="Failed sync attempts"
          tone={summary.failedSyncAttempts > 30 ? "danger" : "warning"}
          value={formatNumber(summary.failedSyncAttempts)}
        />
        <MetricCard
          context="Reports not yet resolved or closed"
          icon="R"
          label="Unresolved reports"
          tone={summary.unresolvedProblemReports > 10 ? "warning" : "default"}
          value={formatNumber(summary.unresolvedProblemReports)}
        />
        <MetricCard
          context="Active operational locations"
          icon="S"
          label="Active stalls"
          value={formatNumber(summary.activeStalls)}
        />
        <MetricCard
          context="Support-safe count; transaction detail is excluded"
          icon="✓"
          label="Sync records processed"
          value={formatNumber(summary.syncRecordsProcessed)}
        />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Panel
          action={
            <Link
              className="text-sm font-semibold text-[#1e513d] hover:underline"
              href="/app-versions"
            >
              Review versions
            </Link>
          }
          description="Share of connected mock devices"
          title="Version distribution"
        >
          <div className="space-y-4 p-5">
            {summary.versionDistribution.map((item) => (
              <div key={item.appVersionId}>
                <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-semibold text-[#364039]">
                      v{item.versionName}
                    </span>
                    {item.outdated ? (
                      <Badge label="Outdated" tone="warning" value="outdated" />
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-[#69736d]">
                    {formatNumber(item.deviceCount)} ·{" "}
                    {formatPercent(item.percentage)}
                  </span>
                </div>
                <div
                  aria-label={`${item.versionName}: ${formatPercent(item.percentage)} of devices`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={item.percentage}
                  className="h-2 overflow-hidden rounded-full bg-[#e7ebe7]"
                  role="progressbar"
                >
                  <div
                    className={
                      item.outdated
                        ? "h-full bg-[#d3a33f]"
                        : "h-full bg-[#2a684f]"
                    }
                    style={{ width: `${Math.max(item.percentage, 1)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          action={
            <Link
              className="text-sm font-semibold text-[#1e513d] hover:underline"
              href="/audit-log"
            >
              Open audit log
            </Link>
          }
          description="Latest support-safe administrator and system events"
          title="Recent activity"
        >
          <DataTable label="Recent platform activity" minWidth="38rem">
            <thead>
              <tr>
                <th scope="col">Activity</th>
                <th scope="col">Actor</th>
                <th scope="col">Outcome</th>
                <th scope="col">Time</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentActivity.map((event) => (
                <tr key={event.id}>
                  <td>
                    <p className="font-semibold text-[#364039]">
                      {titleCase(event.action.replaceAll(".", "_"))}
                    </p>
                    <p className="mt-0.5 text-xs text-[#69736d]">
                      {event.targetLabel}
                    </p>
                  </td>
                  <td>
                    <p className="text-sm">{event.actorName}</p>
                    <p className="text-xs text-[#69736d]">
                      {titleCase(event.actorRole)}
                    </p>
                  </td>
                  <td>
                    <Badge value={event.outcome} />
                  </td>
                  <td className="text-xs whitespace-nowrap text-[#69736d]">
                    {formatDateTime(event.occurredAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>
      </div>
    </div>
  );
}
