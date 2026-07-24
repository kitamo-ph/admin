import type { Metadata } from "next";
import Link from "next/link";

import {
  DataFreshness,
  ServiceErrorState,
} from "@/components/feedback/service-state";
import { FilterBar, FilterField } from "@/components/filters/filter-bar";
import { CopyButton } from "@/components/ui/copy-button";
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
  conflictStatusSchema,
  getAdminService,
  retryStateSchema,
  syncErrorTypeSchema,
  syncStateSchema,
} from "@/lib/admin";
import { requireAdminPermission } from "@/lib/auth/server";
import { formatDateTime, shortenId, titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "Synchronization",
};

type SyncSearchParams = {
  q?: string;
  state?: string;
  retry?: string;
  error?: string;
  conflict?: string;
  business?: string;
  offset?: string;
};

export default async function SynchronizationPage({
  searchParams,
}: {
  searchParams: Promise<SyncSearchParams>;
}) {
  await requireAdminPermission("synchronization:read", "/synchronization");
  const query = await searchParams;
  const offset = parseOffset(query.offset);
  const service = getAdminService();

  const [eventsResult, businessesResult] = await Promise.all([
    service.listSyncEvents({
      search: query.q?.trim() || undefined,
      state: parseEnum(syncStateSchema, query.state),
      retryState: parseEnum(retryStateSchema, query.retry),
      errorType: parseEnum(syncErrorTypeSchema, query.error),
      conflictStatus: parseEnum(conflictStatusSchema, query.conflict),
      businessId: query.business || undefined,
      offset,
      limit: 30,
    }),
    service.listBusinesses({ limit: 100 }),
  ]);

  if (!eventsResult.ok) {
    return (
      <div className="admin-page">
        <PageHeader
          description="Investigate support-safe device sync attempts, retries, failures, stale states, and conflicts."
          eyebrow="Operations"
          title="Synchronization"
        />
        <ServiceErrorState error={eventsResult.error} />
      </div>
    );
  }

  const events = eventsResult.data;
  const businesses = businessesResult.ok ? businessesResult.data.items : [];

  return (
    <div className="admin-page">
      <PageHeader
        actions={
          <DataFreshness
            generatedAt={eventsResult.meta.generatedAt}
            stale={eventsResult.meta.stale}
          />
        }
        description="Investigate support-safe device sync attempts, retries, failures, stale states, and conflicts."
        eyebrow="Operations"
        title="Synchronization"
      />

      <StateBanner tone="info" title="Diagnostics are read-only">
        Retry information is simulated. This platform cannot rewrite merchant
        data, bypass conflict rules, or modify Android SQLite records.
      </StateBanner>

      <FilterBar
        resetHref="/synchronization"
        resultLabel={`${events.total} synchronization events match the current filters`}
      >
        <FilterField label="Search">
          <input
            className="control w-full"
            defaultValue={query.q}
            name="q"
            placeholder="Device, business, stall, correlation ID"
            type="search"
          />
        </FilterField>
        <FilterField label="Sync state">
          <select
            className="control w-full"
            defaultValue={query.state ?? ""}
            name="state"
          >
            <option value="">All states</option>
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
        <FilterField label="Retry state">
          <select
            className="control w-full"
            defaultValue={query.retry ?? ""}
            name="retry"
          >
            <option value="">All retry states</option>
            {["not_required", "scheduled", "in_progress", "exhausted"].map(
              (state) => (
                <option key={state} value={state}>
                  {titleCase(state)}
                </option>
              ),
            )}
          </select>
        </FilterField>
        <FilterField label="Error category">
          <select
            className="control w-full"
            defaultValue={query.error ?? ""}
            name="error"
          >
            <option value="">All error categories</option>
            {[
              "network_timeout",
              "authentication_expired",
              "payload_validation",
              "version_unsupported",
              "conflict",
              "server_unavailable",
            ].map((error) => (
              <option key={error} value={error}>
                {titleCase(error)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Conflict status">
          <select
            className="control w-full"
            defaultValue={query.conflict ?? ""}
            name="conflict"
          >
            <option value="">All conflict states</option>
            {["none", "detected", "resolved"].map((state) => (
              <option key={state} value={state}>
                {titleCase(state)}
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
      </FilterBar>

      <Panel>
        {events.items.length === 0 ? (
          <EmptyState
            action={
              <Link
                className="font-semibold text-[#1e513d] hover:underline"
                href="/synchronization"
              >
                Clear all filters
              </Link>
            }
            description="Try a broader state, retry condition, error category, or business."
            title="No synchronization events match"
          />
        ) : (
          <>
            <div className="hidden lg:block">
              <DataTable label="KitaMo synchronization events" minWidth="86rem">
                <thead>
                  <tr>
                    <th scope="col">State</th>
                    <th scope="col">Device</th>
                    <th scope="col">Business / stall</th>
                    <th scope="col">App version</th>
                    <th scope="col">Retry</th>
                    <th scope="col">Event</th>
                    <th scope="col">Occurred</th>
                    <th scope="col">Synchronized</th>
                    <th scope="col">Error</th>
                    <th scope="col">Conflict</th>
                    <th scope="col">Correlation ID</th>
                  </tr>
                </thead>
                <tbody>
                  {events.items.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <Badge value={event.state} />
                      </td>
                      <td>
                        <p className="font-mono text-xs">
                          {event.deviceIdentifierMasked}
                        </p>
                      </td>
                      <td>
                        <Link
                          className="font-semibold text-[#173f30] hover:underline"
                          href={`/businesses/${event.businessId}#sync`}
                        >
                          {event.businessName}
                        </Link>
                        <p className="mt-0.5 text-xs text-[#69736d]">
                          {event.stallName ?? "No stall"}
                        </p>
                      </td>
                      <td>{event.appVersionName}</td>
                      <td>{titleCase(event.retryState)}</td>
                      <td className="font-medium">
                        {titleCase(event.eventName.replaceAll(".", "_"))}
                      </td>
                      <td className="text-xs whitespace-nowrap text-[#69736d]">
                        {formatDateTime(event.occurredAt)}
                      </td>
                      <td className="text-xs whitespace-nowrap text-[#69736d]">
                        {formatDateTime(event.syncedAt)}
                      </td>
                      <td>
                        {event.errorType ? (
                          <Badge value={event.errorType} />
                        ) : (
                          <span className="text-xs text-[#69736d]">
                            No error
                          </span>
                        )}
                      </td>
                      <td>
                        <Badge value={event.conflictStatus} />
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
            </div>

            <div className="divide-y divide-[#e7ebe7] lg:hidden">
              {events.items.map((event) => (
                <article className="p-4" key={event.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#364039]">
                        {event.businessName}
                      </p>
                      <p className="mt-0.5 text-xs text-[#69736d]">
                        {event.stallName ?? "No stall"} ·{" "}
                        {event.deviceIdentifierMasked}
                      </p>
                    </div>
                    <Badge value={event.state} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-[#69736d]">Occurred</dt>
                      <dd className="mt-1 font-medium">
                        {formatDateTime(event.occurredAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#69736d]">Retry</dt>
                      <dd className="mt-1 font-medium">
                        {titleCase(event.retryState)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#69736d]">Error</dt>
                      <dd className="mt-1 font-medium">
                        {event.errorType
                          ? titleCase(event.errorType)
                          : "No error"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#69736d]">Event</dt>
                      <dd className="mt-1 font-medium">
                        {titleCase(event.eventName.replaceAll(".", "_"))}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex items-center gap-2">
                    <code className="min-w-0 truncate text-xs text-[#69736d]">
                      {event.correlationId}
                    </code>
                    <CopyButton value={event.correlationId} />
                  </div>
                </article>
              ))}
            </div>
            <PaginationControls
              basePath="/synchronization"
              limit={events.limit}
              offset={events.offset}
              query={{
                q: query.q,
                state: query.state,
                retry: query.retry,
                error: query.error,
                conflict: query.conflict,
                business: query.business,
              }}
              total={events.total}
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
