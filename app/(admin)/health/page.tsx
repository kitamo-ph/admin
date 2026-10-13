import type { Metadata } from "next";
import Link from "next/link";

import {
  DataFreshness,
  ServiceErrorState,
} from "@/components/feedback/service-state";
import {
  Badge,
  PageHeader,
  Panel,
  StateBanner,
} from "@/components/ui/primitives";
import { getAdminService } from "@/lib/admin";
import { requireAdminPermission } from "@/lib/auth/server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "System health",
};

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  await requireAdminPermission("health:read", "/health");
  const result = await getAdminService().getSystemHealth();

  if (!result.ok) {
    return (
      <div className="admin-page">
        <PageHeader
          description="Support-safe health indicators for the mock admin environment."
          eyebrow="Platform"
          title="System health"
        />
        <ServiceErrorState error={result.error} />
      </div>
    );
  }

  const health = result.data;

  return (
    <div className="admin-page">
      <PageHeader
        actions={
          <DataFreshness
            generatedAt={result.meta.generatedAt}
            stale={result.meta.stale}
          />
        }
        description="Support-safe health indicators for the mock admin environment."
        eyebrow="Platform"
        title="System health"
      />

      {health.maintenanceMode ? (
        <StateBanner tone="warning" title="Maintenance mode is active">
          Administrative data operations are temporarily paused in this mock
          scenario.
        </StateBanner>
      ) : (
        <StateBanner
          tone={health.overallStatus === "healthy" ? "success" : "warning"}
          title={`Overall status: ${health.overallStatus}`}
        >
          Last checked {formatDateTime(health.checkedAt)}. These fictional
          indicators expose no infrastructure addresses or credentials.
        </StateBanner>
      )}

      <section
        aria-label="Service health indicators"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {health.indicators.map((indicator) => (
          <Panel key={indicator.id}>
            <article className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[var(--km-color-text)]">
                    {indicator.name}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--km-color-text-secondary)]">
                    Checked {formatDateTime(indicator.checkedAt)}
                  </p>
                </div>
                <Badge value={indicator.status} />
              </div>
              <p className="mt-4 min-h-12 text-sm leading-6 text-[var(--km-color-text-secondary)]">
                {indicator.message}
              </p>
              <p className="mt-4 border-t border-[var(--km-color-border)] pt-3 text-xs text-[var(--km-color-text-secondary)]">
                Observed latency:{" "}
                <strong className="text-[var(--km-color-text)]">
                  {indicator.latencyMs === null
                    ? "Not available"
                    : `${indicator.latencyMs} ms`}
                </strong>
              </p>
            </article>
          </Panel>
        ))}
      </section>

      <Panel className="mt-5" title="Basic health endpoint">
        <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <p className="max-w-2xl text-sm leading-6 text-[var(--km-color-text-secondary)]">
            The public liveness route returns only application status, mock
            mode, and a timestamp. It does not disclose dependency details.
          </p>
          <Link
            className="shrink-0 rounded-lg border border-[var(--km-color-border-strong)] bg-white px-4 py-2.5 font-semibold text-[var(--km-color-text)] hover:bg-[var(--km-color-muted)]"
            href="/api/health"
          >
            Open JSON endpoint
          </Link>
        </div>
      </Panel>
    </div>
  );
}
