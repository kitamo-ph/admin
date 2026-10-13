"use server";

import { redirect } from "next/navigation";

import { refusalMessage } from "@/lib/admin/r16-messages";
import { checkFlagReview, type ReviewField } from "@/lib/admin/r16-rules";
import { coreIdSchema, flagStatusSchema } from "@/lib/admin/r16-schemas";
import { safeReturnTo } from "@/lib/auth/kitamo/resolve";
import {
  AdminAuthenticationError,
  assertCurrentAdmin,
} from "@/lib/auth/server";

export type ReviewState = {
  errors?: Partial<Record<ReviewField, string>>;
  message?: string;
};

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** A flag's review (review_admin_flag): transitions with a note (10-500). */
export async function reviewFlagAction(
  _previous: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const flagId = coreIdSchema.safeParse(text(formData, "flagId"));
  const requestId = coreIdSchema.safeParse(text(formData, "requestId"));
  const from = flagStatusSchema.safeParse(text(formData, "from"));
  if (!flagId.success || !requestId.success || !from.success) {
    return { message: "Reload the page and try again." };
  }
  const checked = checkFlagReview(
    from.data,
    text(formData, "status"),
    text(formData, "note"),
  );
  if (!checked.ok) return { errors: checked.errors };

  let context;
  try {
    context = await assertCurrentAdmin("flags:update");
  } catch (error) {
    if (error instanceof AdminAuthenticationError) {
      redirect("/sign-in?returnTo=%2Fflags");
    }
    redirect("/access-denied");
  }
  const result = await context.service.reviewFlag({
    flagId: flagId.data,
    status: checked.value.status,
    note: checked.value.note,
    clientRequestId: requestId.data,
  });
  if (!result.ok) {
    if (result.error.code === "UNAUTHORIZED") redirect("/sign-in?why=expired");
    return { message: refusalMessage(result.error) };
  }
  const back = safeReturnTo(text(formData, "returnTo")).split("?")[0] ?? "";
  redirect(
    back.startsWith("/flags") || back.startsWith("/businesses/")
      ? `${back}?notice=flag_reviewed`
      : "/flags?notice=flag_reviewed",
  );
}
