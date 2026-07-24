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
  MetricCard,
  PageHeader,
  Panel,
} from "@/components/ui/primitives";
import { getAdminService, releaseChannelSchema } from "@/lib/admin";
import { requireAdminPermission } from "@/lib/auth/server";
import { formatDate, formatNumber, titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "App versions",
};

type VersionSearchParams = {
  q?: string;
  channel?: string;
  support?: string;
};

export default async function AppVersionsPage({
  searchParams,
}: {
  searchParams: Promise<VersionSearchParams>;
}) {
  await requireAdminPermission("app_versions:read", "/app-versions");
  const query = await searchParams;
  const supported =
    query.support === "supported"
      ? true
      : query.support === "outdated"
        ? false
        : undefined;

  const result = await getAdminService().listAppVersions({
    search: query.q?.trim() || undefined,
    releaseChannel: parseEnum(releaseChannelSchema, query.channel),
    supported,
    limit: 100,
  });

  if (!result.ok) {
    return (
      <div className="admin-page">
        <PageHeader
          description="Monitor adoption, support status, outdated devices, and issue signals across fictional releases."
          eyebrow="Platform"
          title="App versions"
        />
        <ServiceErrorState error={result.error} />
      </div>
    );
  }

  const versions = result.data;
  const all = versions.items;
  const activeInstalls = all.reduce(
    (total, version) => total + version.activeInstalls,
    0,
  );
  const outdatedDevices = all.reduce(
    (total, version) => total + version.outdatedDeviceCount,
    0,
  );
  const issueCount = all.reduce(
    (total, version) => total + version.issueCount,
    0,
  );

  return (
    <div className="admin-page">
      <PageHeader
        actions={
          <DataFreshness
            generatedAt={result.meta.generatedAt}
            stale={result.meta.stale}
          />
        }
        description="Monitor adoption, support status, outdated devices, and issue signals across fictional releases."
        eyebrow="Platform"
        title="App versions"
      />

      <section
        aria-label="Version metrics"
        className="mb-5 grid gap-4 sm:grid-cols-3"
      >
        <MetricCard
          context="Across versions in the current result"
          icon="V"
          label="Active installs"
          value={formatNumber(activeInstalls)}
        />
        <MetricCard
          context="Devices below the supported threshold"
          icon="!"
          label="Outdated devices"
          tone="warning"
          value={formatNumber(outdatedDevices)}
        />
        <MetricCard
          context="Problem reports associated with these versions"
          icon="R"
          label="Linked issues"
          tone={issueCount > 20 ? "warning" : "default"}
          value={formatNumber(issueCount)}
        />
      </section>

      <FilterBar
        resetHref="/app-versions"
        resultLabel={`${versions.total} versions match the current filters`}
      >
        <FilterField label="Search">
          <input
            className="control w-full"
            defaultValue={query.q}
            name="q"
            placeholder="Version name or code"
            type="search"
          />
        </FilterField>
        <FilterField label="Release channel">
          <select
            className="control w-full"
            defaultValue={query.channel ?? ""}
            name="channel"
          >
            <option value="">All channels</option>
            {["internal", "closed", "open", "production"].map((channel) => (
              <option key={channel} value={channel}>
                {titleCase(channel)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Support status">
          <select
            className="control w-full"
            defaultValue={query.support ?? ""}
            name="support"
          >
            <option value="">All support states</option>
            <option value="supported">Supported</option>
            <option value="outdated">Outdated</option>
          </select>
        </FilterField>
      </FilterBar>

      <Panel>
        {versions.items.length === 0 ? (
          <EmptyState
            action={
              <Link
                className="font-semibold text-[#1e513d] hover:underline"
                href="/app-versions"
              >
                Clear all filters
              </Link>
            }
            description="Try a broader version, channel, or support state."
            title="No app versions match"
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable label="KitaMo Android app versions" minWidth="70rem">
                <thead>
                  <tr>
                    <th scope="col">Version</th>
                    <th scope="col">Channel</th>
                    <th scope="col">Released</th>
                    <th scope="col">Active installs</th>
                    <th scope="col">Active devices</th>
                    <th scope="col">Outdated devices</th>
                    <th scope="col">Issues</th>
                    <th scope="col">Crash indicator</th>
                    <th scope="col">Support</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.items.map((version) => (
                    <tr key={version.id}>
                      <td>
                        <p className="font-semibold text-[#364039]">
                          {version.versionName}
                        </p>
                        <p className="mt-0.5 text-xs text-[#69736d]">
                          Code {version.versionCode}
                        </p>
                      </td>
                      <td>
                        <Badge value={version.releaseChannel} />
                      </td>
                      <td className="text-xs whitespace-nowrap text-[#69736d]">
                        {formatDate(version.releasedAt)}
                      </td>
                      <td>{formatNumber(version.activeInstalls)}</td>
                      <td>{formatNumber(version.activeDeviceCount)}</td>
                      <td>{formatNumber(version.outdatedDeviceCount)}</td>
                      <td>{formatNumber(version.issueCount)}</td>
                      <td>
                        <Badge value={version.crashIndicator} />
                      </td>
                      <td>
                        {version.isMinimumSupported ? (
                          <Badge
                            label="Minimum supported"
                            tone="forest"
                            value="minimum_supported"
                          />
                        ) : (
                          <Badge
                            label={
                              version.isSupported ? "Supported" : "Outdated"
                            }
                            tone={version.isSupported ? "success" : "warning"}
                            value={
                              version.isSupported ? "supported" : "outdated"
                            }
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>

            <div className="divide-y divide-[#e7ebe7] md:hidden">
              {versions.items.map((version) => (
                <article className="p-4" key={version.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#364039]">
                        {version.versionName}
                      </p>
                      <p className="mt-0.5 text-xs text-[#69736d]">
                        Code {version.versionCode} ·{" "}
                        {titleCase(version.releaseChannel)}
                      </p>
                    </div>
                    <Badge
                      label={version.isSupported ? "Supported" : "Outdated"}
                      tone={version.isSupported ? "success" : "warning"}
                      value={version.isSupported ? "supported" : "outdated"}
                    />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-[#69736d]">Active devices</dt>
                      <dd className="mt-1 font-medium">
                        {formatNumber(version.activeDeviceCount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#69736d]">Outdated</dt>
                      <dd className="mt-1 font-medium">
                        {formatNumber(version.outdatedDeviceCount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#69736d]">Issues</dt>
                      <dd className="mt-1 font-medium">{version.issueCount}</dd>
                    </div>
                    <div>
                      <dt className="text-[#69736d]">Crash indicator</dt>
                      <dd className="mt-1">
                        <Badge value={version.crashIndicator} />
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

function parseEnum<T>(
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
  value: string | undefined,
): T | undefined {
  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
}
