import type { Metadata } from "next";
import Link from "next/link";

import { CreateAssociationForm } from "@/components/admin/association-forms";
import { Notice } from "@/components/admin/notices";
import { ServiceErrorState } from "@/components/feedback/service-state";
import {
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/ui/primitives";
import { ASSOCIATION_KIND_LABELS } from "@/lib/admin/r16-rules";
import { ASSOCIATION_LIST_MAX } from "@/lib/admin/r16-schemas";
import { hasPermission } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth/server";
import { formatDateTime, formatNumber, titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "Associations",
};

/**
 * Associations (spec §5.6, D18; 0086): HOAs and barangays whose officers see
 * their member stalls at a glance. The list shows each one's kind (the
 * owner's D18 answers); a super admin creates one after checking its letter.
 * Until Core has 0086 every association method answers NOT_AVAILABLE
 * (PostgREST PGRST202), and this page says what it will do.
 */
export default async function AssociationsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { service, session } = await requireAdmin(
    "associations:read",
    "/associations",
  );
  const query = await searchParams;
  const result = await service.listAssociations();
  const canUpdate = hasPermission(session.role, "associations:update");
  const createPanel = (
    <Panel
      boxed
      description="After checking a letter from the association."
      title="Create an association"
    >
      <CreateAssociationForm requestId={crypto.randomUUID()} />
    </Panel>
  );

  return (
    <div className="admin-page">
      <PageHeader
        description="Homeowners' associations and barangays whose officers see, for each stall that joined with the code, only whether it is open, its hours and how busy it is."
        eyebrow="HOA level"
        title="Associations"
      />
      <Notice value={query.notice} />
      {result.ok ? (
        <div className="grid gap-6">
          {/* The canvas boxes the association screens at every width (its D relayout). */}
          <Panel
            boxed
            description={
              result.data.length >= ASSOCIATION_LIST_MAX
                ? `Showing the first ${ASSOCIATION_LIST_MAX}.`
                : undefined
            }
            title="Associations"
          >
            {result.data.length === 0 ? (
              <EmptyState
                description="No association has been created."
                title="No associations"
              />
            ) : (
              <DataTable label="Associations" layout="cards" minWidth="44rem">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Kind</th>
                    <th scope="col">Status</th>
                    <th scope="col">Member stalls</th>
                    <th scope="col">Officers</th>
                    <th scope="col">Code rotated</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((association) => (
                    <tr key={association.associationId}>
                      <td data-title="">
                        {/* The pass-2 review (ds-11): the only way in, so a 44 px block, underlined as Businesses'
                            names are (it was ink, underlined only on hover, and read as plain text). */}
                        <Link
                          className="flex min-h-11 items-center font-semibold underline underline-offset-4"
                          href={`/associations/${association.associationId}`}
                          prefetch={false}
                        >
                          {association.name}
                        </Link>
                      </td>
                      <td data-label="Kind">
                        {ASSOCIATION_KIND_LABELS[association.kind]}
                      </td>
                      <td data-label="Status">
                        {titleCase(association.status)}
                      </td>
                      <td className="num" data-label="Member stalls">
                        {formatNumber(association.memberStallCount)}
                      </td>
                      <td className="num" data-label="Officers">
                        {formatNumber(association.officerCount)}
                      </td>
                      <td data-label="Code rotated">
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
          {canUpdate ? createPanel : null}
        </div>
      ) : result.error.code === "NOT_AVAILABLE" ? (
        <Panel boxed title="Associations arrive with the HOA level.">
          <div className="grid gap-3 p-5 text-sm">
            <p>When KitaMo has the HOA level, this page will:</p>
            <ul className="list-disc pl-5">
              <li>
                list the associations: name, kind (HOA or barangay), status,
                member stall count, officer count, and when the join code was
                last rotated;
              </li>
              <li>
                create one after checking the association&apos;s letter: name,
                kind, place, and the letter&apos;s reference;
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
        // The list failed (not the HOA level missing): creating still works.
        <div className="grid gap-6">
          <ServiceErrorState error={result.error} />
          {canUpdate ? createPanel : null}
        </div>
      )}
    </div>
  );
}
