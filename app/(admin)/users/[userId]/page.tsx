import type { Metadata } from "next";
import Link from "next/link";

import { ServiceErrorState } from "@/components/feedback/service-state";
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
import { formatDate, formatDateTime, titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "User details",
};

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  await requireAdminPermission("users:read", `/users/${userId}`);

  const result = await getAdminService().getUser(userId);
  if (!result.ok) {
    return (
      <div className="admin-page">
        <Breadcrumbs
          items={[
            { label: "Users", href: "/users" },
            { label: "User details" },
          ]}
        />
        <ServiceErrorState error={result.error} />
      </div>
    );
  }

  const detail = result.data;
  const user = detail.user;

  return (
    <div className="admin-page">
      <Breadcrumbs
        items={[
          { label: "Users", href: "/users" },
          { label: user.displayName },
        ]}
      />
      <PageHeader
        actions={<Badge value={user.accountStatus} />}
        description="Support-safe identity, business relationships, devices, synchronization, and report context."
        eyebrow="User details"
        title={user.displayName}
      />

      <StateBanner tone="info" title="Sensitive identity data is masked">
        This view does not contain passwords, merchant PINs, authentication
        tokens, or complete transaction records.
      </StateBanner>

      <div className="grid gap-5">
        <Panel title="Account overview">
          <KeyValueGrid
            items={[
              { label: "Masked email", value: user.emailMasked },
              {
                label: "Membership roles",
                value: (
                  <div className="flex flex-wrap gap-1.5">
                    {user.membershipRoles.map((role) => (
                      <Badge key={role} value={role} />
                    ))}
                  </div>
                ),
              },
              {
                label: "Business memberships",
                value: user.businessMembershipCount,
              },
              { label: "Registered", value: formatDate(user.createdAt) },
              {
                label: "Last active",
                value: formatDateTime(user.lastActiveAt),
              },
              {
                label: "Current app version",
                value: user.currentAppVersionName ?? "Not recorded",
              },
              { label: "Connected devices", value: user.deviceCount },
              {
                label: "Support history",
                value: `${user.supportHistoryCount} reports`,
              },
            ]}
          />
        </Panel>

        <Panel
          description="Business and stall access represented in the mock service"
          title="Memberships"
        >
          {detail.memberships.length === 0 ? (
            <EmptyState
              description="This fictional user has no active or historical business membership."
              title="No memberships"
            />
          ) : (
            <DataTable label={`${user.displayName} business memberships`}>
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">Stall</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Joined</th>
                </tr>
              </thead>
              <tbody>
                {detail.memberships.map((membership) => (
                  <tr key={membership.id}>
                    <td>
                      <Link
                        className="font-semibold text-[var(--km-color-text)] hover:underline"
                        href={`/businesses/${membership.businessId}`}
                      >
                        {membership.businessName}
                      </Link>
                    </td>
                    <td>{membership.stallName ?? "All stalls"}</td>
                    <td>
                      <Badge value={membership.role} />
                    </td>
                    <td>
                      <Badge value={membership.status} />
                    </td>
                    <td className="text-xs text-[var(--km-color-text-secondary)]">
                      {formatDate(membership.joinedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Panel>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Connected devices">
            {detail.devices.length === 0 ? (
              <EmptyState
                description="No support-safe device registrations are associated with this user."
                title="No devices"
              />
            ) : (
              <div className="divide-y divide-[var(--km-color-border)]">
                {detail.devices.map((device) => (
                  <article className="p-5" key={device.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--km-color-text)]">
                          {device.manufacturer} {device.model}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-[var(--km-color-text-secondary)]">
                          {device.deviceIdentifierMasked}
                        </p>
                      </div>
                      <Badge value={device.syncState} />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <dt className="text-[var(--km-color-text-secondary)]">
                          Android
                        </dt>
                        <dd className="mt-1 font-medium">
                          {device.androidVersion}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--km-color-text-secondary)]">
                          App version
                        </dt>
                        <dd className="mt-1 font-medium">
                          {device.appVersionName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--km-color-text-secondary)]">
                          Device tier
                        </dt>
                        <dd className="mt-1 font-medium">
                          {titleCase(device.performanceTier)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--km-color-text-secondary)]">
                          Last seen
                        </dt>
                        <dd className="mt-1 font-medium">
                          {formatDateTime(device.lastSeenAt)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Related support reports">
            {detail.problemReports.length === 0 ? (
              <EmptyState
                description="No fictional support reports are associated with this user."
                title="No related reports"
              />
            ) : (
              <div className="divide-y divide-[var(--km-color-border)]">
                {detail.problemReports.slice(0, 6).map((report) => (
                  <article className="p-5" key={report.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          className="font-semibold text-[var(--km-color-text)] hover:underline"
                          href={`/problem-reports/${report.id}`}
                        >
                          {report.title}
                        </Link>
                        <p className="mt-1 text-xs text-[var(--km-color-text-secondary)]">
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
          </Panel>
        </div>
      </div>
    </div>
  );
}
