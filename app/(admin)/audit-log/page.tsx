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
  adminRoleSchema,
  auditActionSchema,
  auditOutcomeSchema,
  auditTargetTypeSchema,
  getAdminService,
} from "@/lib/admin";
import { requireAdminPermission } from "@/lib/auth/server";
import { formatDateTime, shortenId, titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "Audit log",
};

type AuditSearchParams = {
  q?: string;
  role?: string;
  action?: string;
  target?: string;
  outcome?: string;
  from?: string;
  to?: string;
  offset?: string;
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<AuditSearchParams>;
}) {
  await requireAdminPermission("audit_log:read", "/audit-log");
  const query = await searchParams;
  const offset = parseOffset(query.offset);

  const result = await getAdminService().listAuditEvents({
    search: query.q?.trim() || undefined,
    actorRole: parseEnum(adminRoleSchema, query.role),
    action: parseEnum(auditActionSchema, query.action),
    targetType: parseEnum(auditTargetTypeSchema, query.target),
    outcome: parseEnum(auditOutcomeSchema, query.outcome),
    from: query.from || undefined,
    to: query.to || undefined,
    offset,
    limit: 30,
  });

  if (!result.ok) {
    return (
      <div className="admin-page">
        <PageHeader
          description="Trace fictional privileged and support activity without exposing raw request payloads."
          eyebrow="Platform"
          title="Audit log"
        />
        <ServiceErrorState error={result.error} />
      </div>
    );
  }

  const events = result.data;

  return (
    <div className="admin-page">
      <PageHeader
        actions={
          <DataFreshness
            generatedAt={result.meta.generatedAt}
            stale={result.meta.stale}
          />
        }
        description="Trace fictional privileged and support activity without exposing raw request payloads."
        eyebrow="Platform"
        title="Audit log"
      />

      <StateBanner tone="info" title="Append-only operational record">
        Audit events cannot be edited, hidden, or deleted. Reasons, outcomes,
        masked source IPs, and correlation IDs are preserved for review.
      </StateBanner>

      <FilterBar
        resetHref="/audit-log"
        resultLabel={`${events.total} audit events match the current filters`}
      >
        <FilterField label="Search">
          <input
            className="control w-full"
            defaultValue={query.q}
            name="q"
            placeholder="Actor, target, reason, correlation ID"
            type="search"
          />
        </FilterField>
        <FilterField label="Actor role">
          <select
            className="control w-full"
            defaultValue={query.role ?? ""}
            name="role"
          >
            <option value="">All roles</option>
            {["super_admin", "support_admin", "operations_viewer"].map(
              (role) => (
                <option key={role} value={role}>
                  {titleCase(role)}
                </option>
              ),
            )}
          </select>
        </FilterField>
        <FilterField label="Action">
          <select
            className="control w-full"
            defaultValue={query.action ?? ""}
            name="action"
          >
            <option value="">All actions</option>
            {[
              "user.viewed",
              "business.viewed",
              "problem_report.reviewed",
              "problem_report.updated",
              "problem_report.resolved",
              "sync.inspected",
              "app_version.viewed",
              "system.health_checked",
            ].map((action) => (
              <option key={action} value={action}>
                {titleCase(action.replaceAll(".", "_"))}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Target type">
          <select
            className="control w-full"
            defaultValue={query.target ?? ""}
            name="target"
          >
            <option value="">All target types</option>
            {[
              "user",
              "business",
              "problem_report",
              "sync_event",
              "app_version",
              "system",
            ].map((target) => (
              <option key={target} value={target}>
                {titleCase(target)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Outcome">
          <select
            className="control w-full"
            defaultValue={query.outcome ?? ""}
            name="outcome"
          >
            <option value="">All outcomes</option>
            {["succeeded", "denied", "failed"].map((outcome) => (
              <option key={outcome} value={outcome}>
                {titleCase(outcome)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="From date">
          <input
            className="control w-full"
            defaultValue={query.from}
            name="from"
            type="date"
          />
        </FilterField>
        <FilterField label="To date">
          <input
            className="control w-full"
            defaultValue={query.to}
            name="to"
            type="date"
          />
        </FilterField>
      </FilterBar>

      <Panel>
        {events.items.length === 0 ? (
          <EmptyState
            action={
              <Link
                className="font-semibold text-[#1e513d] hover:underline"
                href="/audit-log"
              >
                Clear all filters
              </Link>
            }
            description="Try a broader actor, action, target, outcome, or date range."
            title="No audit events match"
          />
        ) : (
          <>
            <div className="hidden lg:block">
              <DataTable
                label="KitaMo administrator audit log"
                minWidth="88rem"
              >
                <thead>
                  <tr>
                    <th scope="col">Timestamp</th>
                    <th scope="col">Actor</th>
                    <th scope="col">Role</th>
                    <th scope="col">Action</th>
                    <th scope="col">Target</th>
                    <th scope="col">Reason</th>
                    <th scope="col">Outcome</th>
                    <th scope="col">Source IP</th>
                    <th scope="col">Correlation ID</th>
                  </tr>
                </thead>
                <tbody>
                  {events.items.map((event) => (
                    <tr key={event.id}>
                      <td className="text-xs whitespace-nowrap text-[#69736d]">
                        {formatDateTime(event.occurredAt)}
                      </td>
                      <td>{event.actorName}</td>
                      <td>
                        <Badge value={event.actorRole} />
                      </td>
                      <td className="font-medium">
                        {titleCase(event.action.replaceAll(".", "_"))}
                      </td>
                      <td>
                        <p className="font-medium">{event.targetLabel}</p>
                        <p className="mt-0.5 text-xs text-[#69736d]">
                          {titleCase(event.targetType)}
                        </p>
                      </td>
                      <td className="max-w-64 text-sm text-[#4f5a53]">
                        <span className="block font-medium text-[#364039]">
                          {titleCase(event.reasonCode)}
                        </span>
                        <span className="mt-1 block">{event.reasonNote}</span>
                      </td>
                      <td>
                        <Badge value={event.outcome} />
                      </td>
                      <td className="font-mono text-xs">
                        {event.sourceIpMasked}
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
                        {titleCase(event.action.replaceAll(".", "_"))}
                      </p>
                      <p className="mt-0.5 text-xs text-[#69736d]">
                        {event.actorName} · {formatDateTime(event.occurredAt)}
                      </p>
                    </div>
                    <Badge value={event.outcome} />
                  </div>
                  <p className="mt-3 text-sm">
                    {event.targetLabel}{" "}
                    <span className="text-[#69736d]">
                      ({titleCase(event.targetType)})
                    </span>
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#69736d]">
                    {titleCase(event.reasonCode)} · {event.reasonNote}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <code className="min-w-0 truncate text-xs">
                      {event.correlationId}
                    </code>
                    <CopyButton value={event.correlationId} />
                  </div>
                </article>
              ))}
            </div>
            <PaginationControls
              basePath="/audit-log"
              limit={events.limit}
              offset={events.offset}
              query={{
                q: query.q,
                role: query.role,
                action: query.action,
                target: query.target,
                outcome: query.outcome,
                from: query.from,
                to: query.to,
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
