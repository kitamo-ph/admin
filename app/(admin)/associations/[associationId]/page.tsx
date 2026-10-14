import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  AddOfficerForm,
  CloseAssociationForm,
  EndOfficerForm,
  RotateCodeForm,
} from "@/components/admin/association-forms";
import { Notice } from "@/components/admin/notices";
import { ServiceErrorState } from "@/components/feedback/service-state";
import {
  Breadcrumbs,
  DataTable,
  EmptyState,
  KeyValueGrid,
  PageHeader,
  Panel,
} from "@/components/ui/primitives";
import { ASSOCIATION_KIND_LABELS, formatJoinCode } from "@/lib/admin/r16-rules";
import { coreIdSchema } from "@/lib/admin/r16-schemas";
import { hasPermission } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth/server";
import { formatDateTime, titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "Association",
};

/**
 * One association (km_admin_association, §12.15): its kind, place, join code
 * and officers (never an officer's email, never a member stall). A super
 * admin adds or ends an officer, rotates the code, or closes it (0086's
 * admin_* functions); every change re-reads this page.
 */
export default async function AssociationPage({
  params,
  searchParams,
}: {
  params: Promise<{ associationId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { associationId } = await params;
  if (!coreIdSchema.safeParse(associationId).success) notFound();
  const here = `/associations/${associationId}`;
  const { service, session } = await requireAdmin("associations:read", here);
  const query = await searchParams;
  const result = await service.getAssociation(associationId);
  const canUpdate = hasPermission(session.role, "associations:update");
  const crumbs = (
    <Breadcrumbs
      items={[
        { label: "Associations", href: "/associations" },
        { label: result.ok ? result.data.name : "Association" },
      ]}
    />
  );

  if (!result.ok) {
    return (
      <div className="admin-page">
        {crumbs}
        <PageHeader
          description="One association, its join code and its officers."
          eyebrow="HOA level"
          title="Association"
        />
        {result.error.code === "NOT_AVAILABLE" ? (
          <Panel title="Associations arrive with the HOA level.">
            <p className="p-5 text-sm">
              KitaMo does not have the HOA level yet.
            </p>
          </Panel>
        ) : (
          <ServiceErrorState error={result.error} />
        )}
      </div>
    );
  }

  const association = result.data;
  // Core names the status; only a closed association takes no more changes.
  const live = association.status !== "closed";
  const kind = ASSOCIATION_KIND_LABELS[association.kind];

  return (
    <div className="admin-page">
      {crumbs}
      <PageHeader
        description="Its officers see, for each stall that joined with the code, only whether it is open, its hours and how busy it is: never a number, a sale or a customer."
        eyebrow={kind}
        title={association.name}
      />
      <Notice value={query.notice} />
      <div className="grid gap-6">
        <Panel title="The association">
          <KeyValueGrid
            items={[
              { label: "Kind", value: kind },
              { label: "Status", value: titleCase(association.status) },
              { label: "Place", value: association.area ?? "Not given" },
              {
                label: "Join code",
                value:
                  association.joinCode === null ? (
                    "None"
                  ) : (
                    <span
                      className="font-mono tracking-[0.12em]"
                      data-testid="join-code"
                    >
                      {formatJoinCode(association.joinCode)}
                    </span>
                  ),
              },
              {
                label: "Code rotated",
                value: association.codeRotatedAt
                  ? formatDateTime(association.codeRotatedAt)
                  : "Never",
              },
            ]}
          />
        </Panel>

        <Panel title="Officers">
          {association.officers.length === 0 ? (
            <EmptyState
              description="Add an officer by the email of their KitaMo account."
              title="No officers"
            />
          ) : (
            <DataTable label="Officers" minWidth="40rem">
              <thead>
                <tr>
                  <th scope="col">Officer</th>
                  <th scope="col">Added</th>
                  <th scope="col">Accepted</th>
                  <th scope="col">Ended</th>
                  {canUpdate && live ? <th scope="col">Role</th> : null}
                </tr>
              </thead>
              <tbody>
                {association.officers.map((officer) => (
                  <tr key={officer.officerId}>
                    <td>{officer.label}</td>
                    <td>{formatDateTime(officer.addedAt)}</td>
                    <td>
                      {officer.acceptedAt
                        ? formatDateTime(officer.acceptedAt)
                        : "Not yet"}
                    </td>
                    <td>
                      {officer.endedAt ? formatDateTime(officer.endedAt) : "—"}
                    </td>
                    {canUpdate && live ? (
                      <td>
                        {officer.endedAt === null ? (
                          <EndOfficerForm
                            associationId={association.associationId}
                            label={officer.label}
                            officerId={officer.officerId}
                            requestId={crypto.randomUUID()}
                          />
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
          {canUpdate && live ? (
            <div className="border-t border-[var(--km-color-border)] p-5">
              <AddOfficerForm
                associationId={association.associationId}
                requestId={crypto.randomUUID()}
              />
            </div>
          ) : null}
        </Panel>

        {canUpdate && live ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Join code">
              <div className="p-5">
                <RotateCodeForm
                  associationId={association.associationId}
                  requestId={crypto.randomUUID()}
                />
              </div>
            </Panel>
            <Panel title="Close">
              <div className="p-5">
                <CloseAssociationForm
                  associationId={association.associationId}
                  requestId={crypto.randomUUID()}
                />
              </div>
            </Panel>
          </div>
        ) : null}
      </div>
    </div>
  );
}
