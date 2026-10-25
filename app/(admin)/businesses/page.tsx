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

      {/* The design pass (Adm Site canvas, Businesses): one search field with its icon and the Search capsule,
          no box around them. "Business name" stays a persistent label (mkt-adm-12): since the pass-2 review,
          inside the 52 px filled field, over the typed words, with the magnifier at its left. */}
      <form
        className="mb-6 flex max-w-[35rem] flex-wrap items-end gap-3"
        method="get"
        role="search"
      >
        <label className="km-label relative min-w-56 flex-1 pl-11">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--km-color-text-secondary)]"
            fill="none"
            height="20"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="20"
          >
            <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l5 5" />
          </svg>
          Business name
          <input
            className="control km-input"
            defaultValue={search}
            maxLength={60}
            name="q"
            type="search"
          />
        </label>
        <button className="km-button min-h-[3.25rem]" type="submit">
          Search
        </button>
        {search ? (
          <Link
            className="km-button-secondary min-h-[3.25rem]"
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
            <DataTable
              label="Business directory"
              layout="cards"
              minWidth="60rem"
            >
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
                    <td data-title="">
                      {/* The pass-2 review (ds-11): the only way in, so a 44 px block, not a 24 px line. */}
                      <Link
                        className="flex min-h-11 items-center font-semibold underline underline-offset-4"
                        href={`/businesses/${row.businessId}`}
                        prefetch={false}
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td data-label="Created">
                      {formatBusinessDay(row.createdOn)}
                    </td>
                    <td data-label="Last sale">
                      {formatBusinessDay(row.lastSaleDay)}
                    </td>
                    <td className="num" data-label="Sales, 7 days">
                      {formatNumber(row.sales7d)}
                    </td>
                    <td className="num" data-label="Stalls">
                      {formatNumber(row.stallCount)}
                    </td>
                    <td className="num" data-label="Staff">
                      {formatNumber(row.staffCount)}
                    </td>
                    <td data-label="Apps on">
                      {row.appsOn.length === 0 ? "None" : row.appsOn.join(", ")}
                    </td>
                    <td className="num" data-label="Open flags">
                      {formatNumber(row.openFlags)}
                    </td>
                    <td data-label="State">
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
            className="km-panel-x flex flex-wrap items-center justify-between gap-3 border-t border-[var(--km-color-border)] py-3"
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
