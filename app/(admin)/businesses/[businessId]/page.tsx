import type { Metadata } from "next";
import Link from "next/link";

import { ServiceErrorState } from "@/components/feedback/service-state";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Badge,
  Breadcrumbs,
  DataTable,
  EmptyState,
  KeyValueGrid,
  PageHeader,
  Panel,
  StateBanner,
} from "@/components/ui/primitives";
import { getAdminService } from "@/lib/admin";
import { requireAdminPermission } from "@/lib/auth/server";
import { formatDate, formatDateTime, shortenId, titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "Business details",
};

const sections = [
  ["overview", "Overview"],
  ["memberships", "Owner & members"],
  ["stalls", "Stalls"],
  ["devices", "Devices"],
  ["versions", "App versions"],
  ["sync", "Sync health"],
  ["reports", "Problem reports"],
  ["audit", "Audit history"],
] as const;

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  await requireAdminPermission("businesses:read", `/businesses/${businessId}`);

  const result = await getAdminService().getBusiness(businessId);
  if (!result.ok) {
    return (
      <div className="admin-page">
        <Breadcrumbs
          items={[
            { label: "Businesses", href: "/businesses" },
            { label: "Business details" },
          ]}
        />
        <ServiceErrorState error={result.error} />
      </div>
    );
  }

  const detail = result.data;
  const business = detail.business;

  return (
    <div className="admin-page">
      <Breadcrumbs
        items={[
          { label: "Businesses", href: "/businesses" },
          { label: business.name },
        ]}
      />
      <PageHeader
        actions={
          <>
            <Badge value={business.status} />
            <Badge value={business.syncHealth} />
          </>
        }
        description={`${titleCase(business.type)} · Owned by ${business.ownerName}`}
        eyebrow="Business details"
        title={business.name}
      />

      <StateBanner tone="info" title="Operational support view">
        This record intentionally excludes sales, expenses, inventory, recipes,
        production, profit calculations, and complete transaction detail.
      </StateBanner>

      <nav
        aria-label="Business detail sections"
        className="mb-5 flex gap-2 overflow-x-auto rounded-xl border border-[#dfe4df] bg-[#fffefa] p-2 shadow-[var(--shadow-card)]"
      >
        {sections.map(([id, label]) => (
          <a
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-[#4f5a53] hover:bg-[#f0f6f2] hover:text-[#173f30]"
            href={`#${id}`}
            key={id}
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="grid gap-5">
        <Panel className="scroll-mt-24" title="Business overview">
          <div id="overview" className="scroll-mt-24">
            <KeyValueGrid
              items={[
                { label: "Business type", value: titleCase(business.type) },
                { label: "Owner", value: business.ownerName },
                { label: "Timezone", value: business.timezone },
                { label: "Status", value: <Badge value={business.status} /> },
                {
                  label: "Synchronization",
                  value: <Badge value={business.syncHealth} />,
                },
                { label: "Active stalls", value: business.stallCount },
                { label: "Seller members", value: business.sellerCount },
                {
                  label: "Connected devices",
                  value: business.connectedDeviceCount,
                },
                {
                  label: "Created",
                  value: formatDate(business.createdAt, business.timezone),
                },
                {
                  label: "Last activity",
                  value: formatDateTime(
                    business.lastActivityAt,
                    business.timezone,
                  ),
                },
              ]}
            />
          </div>
        </Panel>

        <Panel
          className="scroll-mt-24"
          description="Owner and fictional staff access"
          title="Owner & memberships"
        >
          <div id="memberships" className="scroll-mt-24">
            <div className="border-b border-[#e7ebe7] p-5">
              <p className="text-xs font-semibold tracking-[0.05em] text-[#69736d] uppercase">
                Owner
              </p>
              <Link
                className="mt-1 inline-flex font-semibold text-[#173f30] hover:underline"
                href={`/users/${detail.owner.id}`}
              >
                {detail.owner.displayName}
              </Link>
              <p className="mt-0.5 text-xs text-[#69736d]">
                {detail.owner.emailMasked}
              </p>
            </div>
            <DataTable label={`${business.name} memberships`}>
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Role</th>
                  <th scope="col">Stall</th>
                  <th scope="col">Status</th>
                  <th scope="col">Joined</th>
                </tr>
              </thead>
              <tbody>
                {detail.memberships.map((membership) => (
                  <tr key={membership.id}>
                    <td>
                      <Link
                        className="font-semibold text-[#173f30] hover:underline"
                        href={`/users/${membership.userId}`}
                      >
                        {membership.userName}
                      </Link>
                    </td>
                    <td>
                      <Badge value={membership.role} />
                    </td>
                    <td>{membership.stallName ?? "All stalls"}</td>
                    <td>
                      <Badge value={membership.status} />
                    </td>
                    <td className="text-xs text-[#69736d]">
                      {formatDate(membership.joinedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </Panel>

        <Panel className="scroll-mt-24" title="Stalls">
          <div
            id="stalls"
            className="grid scroll-mt-24 gap-3 p-5 md:grid-cols-2"
          >
            {detail.stalls.map((stall) => {
              const stallDevices = detail.devices.filter(
                (device) => device.stallId === stall.id,
              );
              return (
                <article
                  className="rounded-xl border border-[#e3e7e3] bg-[#fafbf8] p-4"
                  key={stall.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#364039]">
                        {stall.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[#69736d]">
                        {stall.locationLabel}
                      </p>
                    </div>
                    <Badge value={stall.status} />
                  </div>
                  <p className="mt-4 text-sm text-[#4f5a53]">
                    {stallDevices.length} connected{" "}
                    {stallDevices.length === 1 ? "device" : "devices"} · Last
                    activity {formatDateTime(stall.lastActivityAt)}
                  </p>
                  <Link
                    className="mt-3 inline-flex text-sm font-semibold text-[#1e513d] hover:underline"
                    href={`/synchronization?stall=${stall.id}`}
                  >
                    View synchronization
                  </Link>
                </article>
              );
            })}
          </div>
        </Panel>

        <Panel className="scroll-mt-24" title="Connected devices">
          <div id="devices" className="scroll-mt-24">
            {detail.devices.length === 0 ? (
              <EmptyState
                description="No devices are registered to this fictional business."
                title="No connected devices"
              />
            ) : (
              <DataTable
                label={`${business.name} connected devices`}
                minWidth="64rem"
              >
                <thead>
                  <tr>
                    <th scope="col">Device</th>
                    <th scope="col">Android</th>
                    <th scope="col">App version</th>
                    <th scope="col">Device tier</th>
                    <th scope="col">Sync state</th>
                    <th scope="col">Last seen</th>
                    <th scope="col">Last successful sync</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.devices.map((device) => (
                    <tr key={device.id}>
                      <td>
                        <p className="font-semibold text-[#364039]">
                          {device.manufacturer} {device.model}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-[#69736d]">
                          {device.deviceIdentifierMasked}
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
            )}
          </div>
        </Panel>

        <Panel className="scroll-mt-24" title="App versions">
          <div id="versions" className="scroll-mt-24">
            <DataTable label={`${business.name} app versions`}>
              <thead>
                <tr>
                  <th scope="col">Version</th>
                  <th scope="col">Channel</th>
                  <th scope="col">Active installs</th>
                  <th scope="col">Outdated</th>
                  <th scope="col">Support status</th>
                </tr>
              </thead>
              <tbody>
                {detail.appVersions.map((version) => (
                  <tr key={version.id}>
                    <td className="font-semibold">
                      {version.versionName} ({version.versionCode})
                    </td>
                    <td>
                      <Badge value={version.releaseChannel} />
                    </td>
                    <td>{version.activeInstalls}</td>
                    <td>{version.outdatedDeviceCount}</td>
                    <td>
                      <Badge
                        label={version.isSupported ? "Supported" : "Outdated"}
                        tone={version.isSupported ? "success" : "warning"}
                        value={version.isSupported ? "supported" : "outdated"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </Panel>

        <Panel className="scroll-mt-24" title="Recent synchronization">
          <div id="sync" className="scroll-mt-24">
            {detail.recentSyncEvents.length === 0 ? (
              <EmptyState
                description="No synchronization events are available for this business."
                title="No recent sync activity"
              />
            ) : (
              <DataTable
                label={`${business.name} recent synchronization events`}
                minWidth="68rem"
              >
                <thead>
                  <tr>
                    <th scope="col">State</th>
                    <th scope="col">Device / stall</th>
                    <th scope="col">App version</th>
                    <th scope="col">Retry</th>
                    <th scope="col">Error</th>
                    <th scope="col">Last attempt</th>
                    <th scope="col">Correlation ID</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recentSyncEvents.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <Badge value={event.state} />
                      </td>
                      <td>
                        <p className="font-mono text-xs">
                          {event.deviceIdentifierMasked}
                        </p>
                        <p className="mt-0.5 text-xs text-[#69736d]">
                          {event.stallName ?? "No stall"}
                        </p>
                      </td>
                      <td>{event.appVersionName}</td>
                      <td>{titleCase(event.retryState)}</td>
                      <td>
                        {event.errorType
                          ? titleCase(event.errorType)
                          : "No error"}
                      </td>
                      <td className="text-xs whitespace-nowrap text-[#69736d]">
                        {formatDateTime(event.occurredAt, business.timezone)}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <code className="text-xs">
                            {shortenId(event.correlationId)}
                          </code>
                          <CopyButton value={event.correlationId} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </div>
        </Panel>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel className="scroll-mt-24" title="Related problem reports">
            <div id="reports" className="scroll-mt-24">
              {detail.problemReports.length === 0 ? (
                <EmptyState
                  description="No support reports are associated with this business."
                  title="No related reports"
                />
              ) : (
                <div className="divide-y divide-[#e7ebe7]">
                  {detail.problemReports.slice(0, 8).map((report) => (
                    <article className="p-5" key={report.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            className="font-semibold text-[#173f30] hover:underline"
                            href={`/problem-reports/${report.id}`}
                          >
                            {report.title}
                          </Link>
                          <p className="mt-1 text-xs text-[#69736d]">
                            {titleCase(report.category)} ·{" "}
                            {formatDateTime(report.submittedAt)}
                          </p>
                        </div>
                        <Badge value={report.status} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          <Panel className="scroll-mt-24" title="Audit history">
            <div id="audit" className="scroll-mt-24">
              {detail.auditEvents.length === 0 ? (
                <EmptyState
                  description="No mock audit events are associated with this business."
                  title="No audit history"
                />
              ) : (
                <div className="divide-y divide-[#e7ebe7]">
                  {detail.auditEvents.slice(0, 8).map((event) => (
                    <article className="p-5" key={event.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#364039]">
                            {titleCase(event.action.replaceAll(".", "_"))}
                          </p>
                          <p className="mt-1 text-xs text-[#69736d]">
                            {event.actorName} ·{" "}
                            {formatDateTime(
                              event.occurredAt,
                              business.timezone,
                            )}
                          </p>
                        </div>
                        <Badge value={event.outcome} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
