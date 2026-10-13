import type { Metadata } from "next";
import Link from "next/link";

import { ServiceErrorState } from "@/components/feedback/service-state";
import {
  Badge,
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  StateBanner,
} from "@/components/ui/primitives";
import { coreIdSchema } from "@/lib/admin/r16-schemas";
import { requireAdmin } from "@/lib/auth/server";
import { formatBusinessDay, formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Businesses",
};

type DirectorySearchParams = { q?: string; after?: string };

/**
 * The directory (spec §5.3, OQ15): no reason needed, and every view is
 * logged by Core. Counts and dates only: no money, no email, no customer.
 */
export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<DirectorySearchParams>;
}) {
  const { service } = await requireAdmin("businesses:read", "/businesses");
  const query = await searchParams;
  const search = query.q?.trim().slice(0, 60) || undefined;
  const after = coreIdSchema.safeParse(query.after);
  const result = await service.listDirectory({
    search,
    after: after.success ? after.data : undefined,
    limit: 50,
  });

  return (
    <div className="admin-page">
      <PageHeader
        description="Every KitaMo business, 50 at a time. Open one with a reason to see its summary."
        eyebrow="Directory"
        title="Businesses"
      />
      <StateBanner tone="info" title="Every view is logged">
        KitaMo records each time this directory is read, with the time and the
        number of rows. It shows no money, email or customer data.
      </StateBanner>

      <form
        className="mb-5 flex flex-wrap items-end gap-3 rounded-[var(--km-radius-surface)] border border-[var(--km-color-border)] bg-[var(--km-color-surface)] p-4"
        method="get"
        role="search"
      >
        <label className="km-label min-w-60 flex-1">
          Business name
          <input
            className="control km-input"
            defaultValue={search}
            maxLength={60}
            name="q"
            type="search"
          />
        </label>
        <button className="km-button" type="submit">
          Search
        </button>
        {search ? (
          <Link
            className="km-button-secondary"
            href="/businesses"
            prefetch={false}
          >
            Clear
          </Link>
        ) : null}
      </form>

      {!result.ok ? (
        <ServiceErrorState error={result.error} />
      ) : (
        <Panel
          description={`${formatNumber(result.data.totals.businesses)} businesses in all · ${formatNumber(result.data.totals.live)} live · ${formatNumber(result.data.totals.hidden)} hidden`}
          title="Directory"
        >
          {result.data.rows.length === 0 ? (
            <EmptyState
              description="No business name matches this search."
              title="No businesses found"
            />
          ) : (
            <DataTable label="Business directory" minWidth="60rem">
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">Created</th>
                  <th scope="col">Last sale</th>
                  <th scope="col">Sales, 7 days</th>
                  <th scope="col">Stalls</th>
                  <th scope="col">Staff</th>
                  <th scope="col">Apps on</th>
                  <th scope="col">Open flags</th>
                  <th scope="col">State</th>
                </tr>
              </thead>
              <tbody>
                {result.data.rows.map((row) => (
                  <tr key={row.businessId}>
                    <td>
                      <Link
                        className="font-semibold underline underline-offset-4"
                        href={`/businesses/${row.businessId}`}
                        prefetch={false}
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td>{formatBusinessDay(row.createdOn)}</td>
                    <td>{formatBusinessDay(row.lastSaleDay)}</td>
                    <td>{formatNumber(row.sales7d)}</td>
                    <td>{formatNumber(row.stallCount)}</td>
                    <td>{formatNumber(row.staffCount)}</td>
                    <td>
                      {row.appsOn.length === 0 ? "None" : row.appsOn.join(", ")}
                    </td>
                    <td>{formatNumber(row.openFlags)}</td>
                    <td>
                      <Badge
                        tone={row.hidden ? "neutral" : "success"}
                        value={row.hidden ? "hidden" : "live"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
          <nav
            aria-label="Directory pages"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--km-color-border)] px-5 py-3"
          >
            <p className="text-xs text-[var(--km-color-text-secondary)]">
              {result.data.rows.length} shown
            </p>
            <div className="flex gap-2">
              {after.success ? (
                <Link
                  className="km-button-secondary km-button-small"
                  href={
                    search
                      ? `/businesses?q=${encodeURIComponent(search)}`
                      : "/businesses"
                  }
                  prefetch={false}
                >
                  First page
                </Link>
              ) : null}
              {result.data.next ? (
                <Link
                  className="km-button-secondary km-button-small"
                  href={`/businesses?${new URLSearchParams({
                    ...(search ? { q: search } : {}),
                    after: result.data.next,
                  }).toString()}`}
                  prefetch={false}
                >
                  Next
                </Link>
              ) : null}
            </div>
          </nav>
        </Panel>
      )}
    </div>
  );
}
