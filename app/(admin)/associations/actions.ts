"use server";

import { redirect } from "next/navigation";

import { ASSOCIATION_REASONS, refusalMessage } from "@/lib/admin/r16-messages";
import {
  checkAddOfficer,
  checkCreateAssociation,
  type AddOfficerField,
  type CreateAssociationField,
} from "@/lib/admin/r16-rules";
import { coreIdSchema } from "@/lib/admin/r16-schemas";
import type { ServiceError } from "@/lib/admin/schemas";
import {
  AdminAuthenticationError,
  assertCurrentAdmin,
} from "@/lib/auth/server";

/**
 * The association writes (0086's admin_* functions, D18 §2, spec §5.6). They
 * change association records only, never a business's (OQ21). Each form
 * carries a request id made when the page rendered, so a resubmit replays.
 */

export type CreateState = {
  errors?: Partial<Record<CreateAssociationField, string>>;
  message?: string;
};
export type OfficerState = {
  errors?: Partial<Record<AddOfficerField, string>>;
  message?: string;
};
export type ChangeState = { errors?: { confirm?: string }; message?: string };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function adminFor(returnTo: string) {
  try {
    return await assertCurrentAdmin("associations:update");
  } catch (error) {
    if (error instanceof AdminAuthenticationError) {
      redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
    }
    redirect("/access-denied");
  }
}

/** A refusal's message; an ended sign-in goes back to sign in. */
function refused(error: ServiceError): { message: string } {
  if (error.code === "UNAUTHORIZED") redirect("/sign-in?why=expired");
  return { message: refusalMessage(error, ASSOCIATION_REASONS) };
}

export async function createAssociationAction(
  _previous: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const requestId = coreIdSchema.safeParse(text(formData, "requestId"));
  if (!requestId.success) return { message: "Reload the page and try again." };
  const checked = checkCreateAssociation({
    name: text(formData, "name"),
    kind: text(formData, "kind"),
    area: text(formData, "area"),
    letterReference: text(formData, "letterReference"),
  });
  if (!checked.ok) return { errors: checked.errors };
  const context = await adminFor("/associations");
  const result = await context.service.createAssociation({
    ...checked.value,
    clientRequestId: requestId.data,
  });
  if (!result.ok) return refused(result.error);
  redirect(
    `/associations/${result.data.associationId}?notice=association_created`,
  );
}

export async function addOfficerAction(
  _previous: OfficerState,
  formData: FormData,
): Promise<OfficerState> {
  const associationId = coreIdSchema.safeParse(text(formData, "associationId"));
  const requestId = coreIdSchema.safeParse(text(formData, "requestId"));
  if (!associationId.success || !requestId.success) {
    return { message: "Reload the page and try again." };
  }
  const page = `/associations/${associationId.data}`;
  const checked = checkAddOfficer({
    email: text(formData, "email"),
    label: text(formData, "label"),
  });
  if (!checked.ok) return { errors: checked.errors };
  const context = await adminFor(page);
  const result = await context.service.addAssociationOfficer({
    associationId: associationId.data,
    ...checked.value,
    clientRequestId: requestId.data,
  });
  if (!result.ok) return refused(result.error);
  redirect(`${page}?notice=officer_added`);
}

export async function endOfficerAction(
  _previous: ChangeState,
  formData: FormData,
): Promise<ChangeState> {
  const associationId = coreIdSchema.safeParse(text(formData, "associationId"));
  const officerId = coreIdSchema.safeParse(text(formData, "officerId"));
  const requestId = coreIdSchema.safeParse(text(formData, "requestId"));
  if (!associationId.success || !officerId.success || !requestId.success) {
    return { message: "Reload the page and try again." };
  }
  const page = `/associations/${associationId.data}`;
  const context = await adminFor(page);
  const result = await context.service.endAssociationOfficer({
    officerId: officerId.data,
    clientRequestId: requestId.data,
  });
  if (!result.ok) return refused(result.error);
  redirect(`${page}?notice=officer_ended`);
}

export async function rotateCodeAction(
  _previous: ChangeState,
  formData: FormData,
): Promise<ChangeState> {
  const associationId = coreIdSchema.safeParse(text(formData, "associationId"));
  const requestId = coreIdSchema.safeParse(text(formData, "requestId"));
  if (!associationId.success || !requestId.success) {
    return { message: "Reload the page and try again." };
  }
  const page = `/associations/${associationId.data}`;
  const context = await adminFor(page);
  const result = await context.service.rotateAssociationCode({
    associationId: associationId.data,
    clientRequestId: requestId.data,
  });
  if (!result.ok) return refused(result.error);
  redirect(`${page}?notice=code_rotated`);
}

export async function closeAssociationAction(
  _previous: ChangeState,
  formData: FormData,
): Promise<ChangeState> {
  const associationId = coreIdSchema.safeParse(text(formData, "associationId"));
  const requestId = coreIdSchema.safeParse(text(formData, "requestId"));
  if (!associationId.success || !requestId.success) {
    return { message: "Reload the page and try again." };
  }
  if (text(formData, "confirm") !== "yes") {
    return {
      errors: {
        confirm: "Tick the box to confirm. Closing cannot be undone here.",
      },
    };
  }
  const page = `/associations/${associationId.data}`;
  const context = await adminFor(page);
  const result = await context.service.closeAssociation({
    associationId: associationId.data,
    clientRequestId: requestId.data,
  });
  if (!result.ok) return refused(result.error);
  redirect(`${page}?notice=association_closed`);
}
