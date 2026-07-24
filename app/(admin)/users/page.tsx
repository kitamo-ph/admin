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
  accountStatusSchema,
  getAdminService,
  membershipRoleSchema,
} from "@/lib/admin";
import { requireAdminPermission } from "@/lib/auth/server";
import { formatDateTime, titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "Users",
};

type UserSearchParams = {
  q?: string;
  status?: string;
  role?: string;
  business?: string;
  offset?: string;
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<UserSearchParams>;
}) {
  await requireAdminPermission("users:read", "/users");
  const query = await searchParams;
  const offset = parseOffset(query.offset);
  const service = getAdminService();

  const [usersResult, businessesResult] = await Promise.all([
    service.listUsers({
      search: query.q?.trim() || undefined,
      accountStatus: accountStatusSchema.safeParse(query.status).success
        ? accountStatusSchema.parse(query.status)
        : undefined,
      role: membershipRoleSchema.safeParse(query.role).success
        ? membershipRoleSchema.parse(query.role)
        : undefined,
      businessId: query.business || undefined,
      offset,
      limit: 25,
    }),
    service.listBusinesses({ limit: 100 }),
  ]);

  if (!usersResult.ok) {
    return (
      <div className="admin-page">
        <PageHeader
          description="Find fictional platform users and review support-safe account context."
          eyebrow="People"
          title="Users"
        />
        <ServiceErrorState error={usersResult.error} />
      </div>
    );
  }

  const users = usersResult.data;
  const businessOptions = businessesResult.ok
    ? businessesResult.data.items
    : [];

  return (
    <div className="admin-page">
      <PageHeader
        actions={
          <DataFreshness
            generatedAt={usersResult.meta.generatedAt}
            stale={usersResult.meta.stale}
          />
        }
        description="Find fictional platform users and review support-safe account context."
        eyebrow="People"
        title="Users"
      />

      <StateBanner tone="info" title="Privacy-limited directory">
        Emails and device identifiers are masked. Authentication credentials,
        merchant PINs, and transaction records are never available here.
      </StateBanner>

      <FilterBar
        resetHref="/users"
        resultLabel={`${users.total} users match the current filters`}
      >
        <FilterField label="Search">
          <input
            className="control w-full"
            defaultValue={query.q}
            name="q"
            placeholder="Name, masked email, business"
            type="search"
          />
        </FilterField>
        <FilterField label="Account status">
          <select
            className="control w-full"
            defaultValue={query.status ?? ""}
            name="status"
          >
            <option value="">All statuses</option>
            {["active", "invited", "suspended", "disabled"].map((status) => (
              <option key={status} value={status}>
                {titleCase(status)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Membership role">
          <select
            className="control w-full"
            defaultValue={query.role ?? ""}
            name="role"
          >
            <option value="">All roles</option>
            {["owner", "manager", "seller"].map((role) => (
              <option key={role} value={role}>
                {titleCase(role)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Business membership">
          <select
            className="control w-full"
            defaultValue={query.business ?? ""}
            name="business"
          >
            <option value="">All businesses</option>
            {businessOptions.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      <Panel>
        {users.items.length === 0 ? (
          <EmptyState
            action={
              <Link
                className="font-semibold text-[#1e513d] hover:underline"
                href="/users"
              >
                Clear all filters
              </Link>
            }
            description="Try a broader name, status, role, or business membership."
            title="No users match these filters"
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable label="KitaMo platform users" minWidth="72rem">
                <thead>
                  <tr>
                    <th scope="col">User</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Business membership</th>
                    <th scope="col">Last active</th>
                    <th scope="col">App version</th>
                    <th scope="col">Devices</th>
                    <th scope="col">Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {users.items.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <Link
                          className="font-semibold text-[#173f30] hover:underline"
                          href={`/users/${user.id}`}
                        >
                          {user.displayName}
                        </Link>
                        <p className="mt-0.5 text-xs text-[#69736d]">
                          {user.emailMasked}
                        </p>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {user.membershipRoles.map((role) => (
                            <Badge key={role} value={role} />
                          ))}
                        </div>
                      </td>
                      <td>
                        <Badge value={user.accountStatus} />
                      </td>
                      <td>
                        <p className="max-w-48 truncate text-sm">
                          {user.businessNames[0] ?? "No business"}
                        </p>
                        {user.businessMembershipCount > 1 ? (
                          <p className="text-xs text-[#69736d]">
                            +{user.businessMembershipCount - 1} more
                          </p>
                        ) : null}
                      </td>
                      <td className="text-xs whitespace-nowrap text-[#69736d]">
                        {formatDateTime(user.lastActiveAt)}
                      </td>
                      <td className="text-sm whitespace-nowrap">
                        {user.currentAppVersionName ?? "Not recorded"}
                      </td>
                      <td>{user.deviceCount}</td>
                      <td>{user.supportHistoryCount}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>

            <div className="divide-y divide-[#e7ebe7] md:hidden">
              {users.items.map((user) => (
                <article className="p-4" key={user.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        className="font-semibold text-[#173f30] hover:underline"
                        href={`/users/${user.id}`}
                      >
                        {user.displayName}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-[#69736d]">
                        {user.emailMasked}
                      </p>
                    </div>
                    <Badge value={user.accountStatus} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-[#69736d]">Business</dt>
                      <dd className="mt-1 font-medium">
                        {user.businessNames[0] ?? "None"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#69736d]">App version</dt>
                      <dd className="mt-1 font-medium">
                        {user.currentAppVersionName ?? "Not recorded"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#69736d]">Devices</dt>
                      <dd className="mt-1 font-medium">{user.deviceCount}</dd>
                    </div>
                    <div>
                      <dt className="text-[#69736d]">Last active</dt>
                      <dd className="mt-1 font-medium">
                        {formatDateTime(user.lastActiveAt)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
            <PaginationControls
              basePath="/users"
              limit={users.limit}
              offset={users.offset}
              query={{
                q: query.q,
                status: query.status,
                role: query.role,
                business: query.business,
              }}
              total={users.total}
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
