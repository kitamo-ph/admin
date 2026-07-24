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
  businessStatusSchema,
  businessTypeSchema,
  getAdminService,
  syncHealthStatusSchema,
} from "@/lib/admin";
import { requireAdminPermission } from "@/lib/auth/server";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "Businesses",
};

type BusinessSearchParams = {
  q?: string;
  type?: string;
  status?: string;
  sync?: string;
  offset?: string;
};

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<BusinessSearchParams>;
}) {
  await requireAdminPermission("businesses:read", "/businesses");
  const query = await searchParams;
  const offset = parseOffset(query.offset);

  const result = await getAdminService().listBusinesses({
    search: query.q?.trim() || undefined,
    type: parseEnum(businessTypeSchema, query.type),
    status: parseEnum(businessStatusSchema, query.status),
    syncHealth: parseEnum(syncHealthStatusSchema, query.sync),
    offset,
    limit: 25,
  });

  if (!result.ok) {
    return (
      <div className="admin-page">
        <PageHeader
          description="Review fictional businesses through operational, membership, and synchronization context."
          eyebrow="People"
          title="Businesses"
        />
        <ServiceErrorState error={result.error} />
      </div>
    );
  }

  const businesses = result.data;

  return (
    <div className="admin-page">
      <PageHeader
        actions={
          <DataFreshness
            generatedAt={result.meta.generatedAt}
            stale={result.meta.stale}
          />
        }
        description="Review fictional businesses through operational, membership, and synchronization context."
        eyebrow="People"
        title="Businesses"
      />

      <FilterBar
        resetHref="/businesses"
        resultLabel={`${businesses.total} businesses match the current filters`}
      >
        <FilterField label="Search">
          <input
            className="control w-full"
            defaultValue={query.q}
            name="q"
            placeholder="Business or owner name"
            type="search"
          />
        </FilterField>
        <FilterField label="Business type">
          <select
            className="control w-full"
            defaultValue={query.type ?? ""}
            name="type"
          >
            <option value="">All types</option>
            {[
              "sari_sari_store",
              "karinderia",
              "market_vendor",
              "kiosk",
              "food_seller",
              "other",
            ].map((type) => (
              <option key={type} value={type}>
                {titleCase(type)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Account status">
          <select
            className="control w-full"
            defaultValue={query.status ?? ""}
            name="status"
          >
            <option value="">All statuses</option>
            {["active", "inactive", "suspended", "under_review"].map(
              (status) => (
                <option key={status} value={status}>
                  {titleCase(status)}
                </option>
              ),
            )}
          </select>
        </FilterField>
        <FilterField label="Sync health">
          <select
            className="control w-full"
            defaultValue={query.sync ?? ""}
            name="sync"
          >
            <option value="">All health states</option>
            {["healthy", "degraded", "critical", "unknown"].map((status) => (
              <option key={status} value={status}>
                {titleCase(status)}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      <Panel>
        {businesses.items.length === 0 ? (
          <EmptyState
            action={
              <Link
                className="font-semibold text-[#1e513d] hover:underline"
                href="/businesses"
              >
                Clear all filters
              </Link>
            }
            description="Try a broader business name, type, status, or synchronization state."
            title="No businesses match these filters"
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable label="KitaMo businesses" minWidth="70rem">
                <thead>
                  <tr>
                    <th scope="col">Business</th>
                    <th scope="col">Type</th>
                    <th scope="col">Owner</th>
                    <th scope="col">Stalls</th>
                    <th scope="col">Sellers</th>
                    <th scope="col">Status</th>
                    <th scope="col">Sync health</th>
                    <th scope="col">Created</th>
                    <th scope="col">Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.items.map((business) => (
                    <tr key={business.id}>
                      <td>
                        <Link
                          className="font-semibold text-[#173f30] hover:underline"
                          href={`/businesses/${business.id}`}
                        >
                          {business.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-[#69736d]">
                          {business.connectedDeviceCount} connected devices
                        </p>
                      </td>
                      <td className="text-sm">{titleCase(business.type)}</td>
                      <td>{business.ownerName}</td>
                      <td>{business.stallCount}</td>
                      <td>{business.sellerCount}</td>
                      <td>
                        <Badge value={business.status} />
                      </td>
                      <td>
                        <Badge value={business.syncHealth} />
                      </td>
                      <td className="text-xs whitespace-nowrap text-[#69736d]">
                        {formatDate(business.createdAt)}
                      </td>
                      <td className="text-xs whitespace-nowrap text-[#69736d]">
                        {formatDateTime(business.lastActivityAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>

            <div className="divide-y divide-[#e7ebe7] md:hidden">
              {businesses.items.map((business) => (
                <article className="p-4" key={business.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        className="font-semibold text-[#173f30] hover:underline"
                        href={`/businesses/${business.id}`}
                      >
                        {business.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-[#69736d]">
                        {titleCase(business.type)} · {business.ownerName}
                      </p>
                    </div>
                    <Badge value={business.syncHealth} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-[#69736d]">Status</dt>
                      <dd className="mt-1">
                        <Badge value={business.status} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#69736d]">Stalls / sellers</dt>
                      <dd className="mt-1 font-medium">
                        {business.stallCount} / {business.sellerCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#69736d]">Devices</dt>
                      <dd className="mt-1 font-medium">
                        {business.connectedDeviceCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#69736d]">Last activity</dt>
                      <dd className="mt-1 font-medium">
                        {formatDateTime(business.lastActivityAt)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
            <PaginationControls
              basePath="/businesses"
              limit={businesses.limit}
              offset={businesses.offset}
              query={{
                q: query.q,
                type: query.type,
                status: query.status,
                sync: query.sync,
              }}
              total={businesses.total}
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
