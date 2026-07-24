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
  StateBanner,
} from "@/components/ui/primitives";
import {
  devicePerformanceTierSchema,
  getAdminService,
  syncStateSchema,
} from "@/lib/admin";
import { requireAdminPermission } from "@/lib/auth/server";
import { formatDateTime, titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "Stalls & devices",
};

type DeviceSearchParams = {
  q?: string;
  sync?: string;
  tier?: string;
  business?: string;
  version?: string;
  offset?: string;
};

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<DeviceSearchParams>;
}) {
  await requireAdminPermission("devices:read", "/devices");
  const query = await searchParams;
  const offset = parseOffset(query.offset);
  const service = getAdminService();

  const [devicesResult, businessesResult, versionsResult] = await Promise.all([
    service.listDevices({
      search: query.q?.trim() || undefined,
      syncState: parseEnum(syncStateSchema, query.sync),
      performanceTier: parseEnum(devicePerformanceTierSchema, query.tier),
      businessId: query.business || undefined,
      appVersionId: query.version || undefined,
      offset,
      limit: 25,
    }),
    service.listBusinesses({ limit: 100 }),
    service.listAppVersions({ limit: 100 }),
  ]);

  if (!devicesResult.ok) {
    return (
      <div className="admin-page">
        <PageHeader
          description="Review support-safe stall and Android device context without remote-control capabilities."
          eyebrow="Operations"
          title="Stalls & devices"
        />
        <ServiceErrorState error={devicesResult.error} />
      </div>
    );
  }

  const devices = devicesResult.data;
  const businesses = businessesResult.ok ? businessesResult.data.items : [];
  const versions = versionsResult.ok ? versionsResult.data.items : [];
  const staleCount = devices.items.filter(
    (device) => device.syncState === "stale",
  ).length;

  return (
    <div className="admin-page">
      <PageHeader
        actions={
          <DataFreshness
            generatedAt={devicesResult.meta.generatedAt}
            stale={devicesResult.meta.stale}
          />
        }
        description="Review support-safe stall and Android device context without remote-control capabilities."
        eyebrow="Operations"
        title="Stalls & devices"
      />

      {staleCount > 0 ? (
        <StateBanner tone="warning" title="Stale devices need review">
          {staleCount} device{staleCount === 1 ? "" : "s"} on this page have not
          synchronized within the configured 24-hour threshold.
        </StateBanner>
      ) : null}

      <FilterBar
        resetHref="/devices"
        resultLabel={`${devices.total} devices match the current filters`}
      >
        <FilterField label="Search">
          <input
            className="control w-full"
            defaultValue={query.q}
            name="q"
            placeholder="Model, masked ID, stall"
            type="search"
          />
        </FilterField>
        <FilterField label="Synchronization">
          <select
            className="control w-full"
            defaultValue={query.sync ?? ""}
            name="sync"
          >
            <option value="">All sync states</option>
            {[
              "healthy",
              "pending",
              "retrying",
              "failed",
              "stale",
              "conflict",
            ].map((state) => (
              <option key={state} value={state}>
                {titleCase(state)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Device tier">
          <select
            className="control w-full"
            defaultValue={query.tier ?? ""}
            name="tier"
          >
            <option value="">All device tiers</option>
            {["low_end", "mid_range", "high_end"].map((tier) => (
              <option key={tier} value={tier}>
                {titleCase(tier)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Business">
          <select
            className="control w-full"
            defaultValue={query.business ?? ""}
            name="business"
          >
            <option value="">All businesses</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="App version">
          <select
            className="control w-full"
            defaultValue={query.version ?? ""}
            name="version"
          >
            <option value="">All versions</option>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.versionName}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      <Panel>
        {devices.items.length === 0 ? (
          <EmptyState
            action={
              <Link
                className="font-semibold text-[#1e513d] hover:underline"
                href="/devices"
              >
                Clear all filters
              </Link>
            }
            description="Try a broader model, sync state, business, or app version."
            title="No devices match these filters"
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable
                label="Connected KitaMo Android devices"
                minWidth="74rem"
              >
                <thead>
                  <tr>
                    <th scope="col">Device</th>
                    <th scope="col">Business / stall</th>
                    <th scope="col">Android</th>
                    <th scope="col">App version</th>
                    <th scope="col">Tier</th>
                    <th scope="col">Sync state</th>
                    <th scope="col">Last seen</th>
                    <th scope="col">Last successful sync</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.items.map((device) => (
                    <tr key={device.id}>
                      <td>
                        <p className="font-semibold text-[#364039]">
                          {device.manufacturer} {device.model}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-[#69736d]">
                          {device.deviceIdentifierMasked}
                        </p>
                      </td>
                      <td>
                        <Link
                          className="font-semibold text-[#173f30] hover:underline"
                          href={`/businesses/${device.businessId}#devices`}
                        >
                          {device.businessName}
                        </Link>
                        <p className="mt-0.5 text-xs text-[#69736d]">
                          {device.stallName ?? "Unassigned stall"}
                        </p>
                      </td>
                      <td>{device.androidVersion}</td>
                      <td>{device.appVersionName}</td>
                      <td>{titleCase(device.performanceTier)}</td>
                      <td>
                        <Badge value={device.syncState} />
                      </td>
                      <td className="text-xs whitespace-nowrap text-[#69736d]">
                        {formatDateTime(device.lastSeenAt)}
                      </td>
                      <td className="text-xs whitespace-nowrap text-[#69736d]">
                        {formatDateTime(device.lastSuccessfulSyncAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>

            <div className="divide-y divide-[#e7ebe7] md:hidden">
              {devices.items.map((device) => (
                <article className="p-4" key={device.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#364039]">
                        {device.manufacturer} {device.model}
                      </p>
                      <p className="font-mono text-xs text-[#69736d]">
                        {device.deviceIdentifierMasked}
                      </p>
                    </div>
                    <Badge value={device.syncState} />
                  </div>
                  <p className="mt-3 text-sm font-medium">
                    {device.businessName} ·{" "}
                    {device.stallName ?? "Unassigned stall"}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-[#69736d]">Android</dt>
                      <dd className="mt-1 font-medium">
                        {device.androidVersion}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#69736d]">App version</dt>
                      <dd className="mt-1 font-medium">
                        {device.appVersionName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#69736d]">Last seen</dt>
                      <dd className="mt-1 font-medium">
                        {formatDateTime(device.lastSeenAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#69736d]">Device tier</dt>
                      <dd className="mt-1 font-medium">
                        {titleCase(device.performanceTier)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
            <PaginationControls
              basePath="/devices"
              limit={devices.limit}
              offset={devices.offset}
              query={{
                q: query.q,
                sync: query.sync,
                tier: query.tier,
                business: query.business,
                version: query.version,
              }}
              total={devices.total}
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
