import type { Metadata } from "next";

import { ServiceErrorState } from "@/components/feedback/service-state";
import {
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/server";
import { formatDateTime, formatNumber, titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "Associations",
};

/**
 * Associations (spec §5.6): a stub until the HOA level (the JR's 0086). The
 * adapter's listAssociations answers NOT_AVAILABLE (PostgREST PGRST202)
 * until Core has the function; this page then names what it will do.
 */
export default async function AssociationsPage() {
  const { service } = await requireAdmin("associations:read", "/associations");
  const result = await service.listAssociations();

  return (
    <div className="admin-page">
      <PageHeader
        description="Market and vendor associations (HOA) that see their members' stalls at a glance."
        eyebrow="HOA level"
        title="Associations"
      />
      {result.ok ? (
        <Panel title="Associations">
          {result.data.length === 0 ? (
            <EmptyState
              description="No association has been created."
              title="No associations"
            />
          ) : (
            <DataTable label="Associations" minWidth="40rem">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Status</th>
                  <th scope="col">Member stalls</th>
                  <th scope="col">Officers</th>
                  <th scope="col">Code rotated</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((association) => (
                  <tr key={association.associationId}>
                    <td>{association.name}</td>
                    <td>{titleCase(association.status)}</td>
                    <td>{formatNumber(association.memberStallCount)}</td>
                    <td>{formatNumber(association.officerCount)}</td>
                    <td>
                      {association.codeRotatedAt
                        ? formatDateTime(association.codeRotatedAt)
                        : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Panel>
      ) : result.error.code === "NOT_AVAILABLE" ? (
        <Panel title="Associations arrive with the HOA level.">
          <div className="grid gap-3 p-5 text-sm">
            <p>When KitaMo has the HOA level, this page will:</p>
            <ul className="list-disc pl-5">
              <li>
                list the associations: name, status, member stall count, officer
                count, and when the join code was last rotated;
              </li>
              <li>
                create one after checking the association&apos;s letter: name,
                place, and the letter&apos;s reference;
              </li>
              <li>add or end an officer, by their KitaMo email;</li>
              <li>rotate the join code, and close an association.</li>
            </ul>
            <p className="km-hint">
              These change association records only, never a business&apos;s
              records, and every read is logged like the rest of this site.
            </p>
          </div>
        </Panel>
      ) : (
        <ServiceErrorState error={result.error} />
      )}
    </div>
  );
}
