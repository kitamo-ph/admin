"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { refusalMessage } from "@/lib/admin/r16-messages";
import {
  checkRaiseFlag,
  checkReasonSheet,
  type RaiseField,
  type ReasonSheetField,
} from "@/lib/admin/r16-rules";
import { coreIdSchema } from "@/lib/admin/r16-schemas";
import {
  AdminAuthenticationError,
  assertCurrentAdmin,
} from "@/lib/auth/server";

export type SheetState = {
  errors?: Partial<Record<ReasonSheetField, string>>;
  message?: string;
};

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function adminFor(
  permission: "business_access:open" | "flags:update",
  returnTo: string,
) {
  try {
    return await assertCurrentAdmin(permission);
  } catch (error) {
    if (error instanceof AdminAuthenticationError) {
      redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
    }
    redirect("/access-denied");
  }
}

/**
 * The reason sheet's submit (open_admin_access). The rules run here again
 * (the sheet's own check is a convenience); Core enforces them a third time.
 */
export async function openAccessAction(
  _previous: SheetState,
  formData: FormData,
): Promise<SheetState> {
  const businessId = coreIdSchema.safeParse(text(formData, "businessId"));
  const requestId = coreIdSchema.safeParse(text(formData, "requestId"));
  if (!businessId.success || !requestId.success) {
    return { message: "Reload the page and try again." };
  }
  const page = `/businesses/${businessId.data}`;
  const sheet = checkReasonSheet({
    level: text(formData, "level"),
    reasonCode: text(formData, "reasonCode"),
    reasonText: text(formData, "reasonText"),
    flagId: text(formData, "flagId"),
    reference: text(formData, "reference"),
    withholdCode: text(formData, "withholdCode"),
    withholdDays: text(formData, "withholdDays"),
  });
  if (!sheet.ok) return { errors: sheet.errors };

  const { service } = await adminFor("business_access:open", page);
  const result = await service.openAccess({
    businessId: businessId.data,
    ...sheet.value,
    clientRequestId: requestId.data,
  });
  if (!result.ok) {
    if (result.error.code === "UNAUTHORIZED") redirect("/sign-in?why=expired");
    return { message: refusalMessage(result.error) };
  }
  // The banner lives in the shared layout, which a client-side redirect
  // would otherwise keep as it was: invalidate it so the new access shows.
  revalidatePath("/", "layout");
  redirect(sheet.value.level === "records" ? `${page}/records` : page);
}

export type RaiseState = {
  errors?: Partial<Record<RaiseField, string>>;
  message?: string;
  done?: boolean;
};

/** "Raise a flag" from the Summary (raise_admin_flag): a lead, never proof. */
export async function raiseFlagAction(
  _previous: RaiseState,
  formData: FormData,
): Promise<RaiseState> {
  const businessId = coreIdSchema.safeParse(text(formData, "businessId"));
  const requestId = coreIdSchema.safeParse(text(formData, "requestId"));
  if (!businessId.success || !requestId.success) {
    return { message: "Reload the page and try again." };
  }
  const page = `/businesses/${businessId.data}`;
  let counts: Record<string, number> | null = null;
  if (text(formData, "attachHealth") === "yes") {
    try {
      const parsed: unknown = JSON.parse(text(formData, "healthCounts"));
      counts =
        parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, number>)
          : null;
    } catch {
      counts = null;
    }
    if (counts === null)
      return { errors: { evidence: "Reload the page and try again." } };
  }
  const checked = checkRaiseFlag({
    kind: text(formData, "kind"),
    source: text(formData, "source"),
    check: text(formData, "check"),
    counts,
  });
  if (!checked.ok) return { errors: checked.errors };

  const { service } = await adminFor("flags:update", page);
  const result = await service.raiseFlag({
    businessId: businessId.data,
    ...checked.value,
    clientRequestId: requestId.data,
  });
  if (!result.ok) {
    if (result.error.code === "UNAUTHORIZED") redirect("/sign-in?why=expired");
    return { message: refusalMessage(result.error) };
  }
  redirect(`${page}?notice=flag_raised`);
}
