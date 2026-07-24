"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminService, updateProblemReportInputSchema } from "@/lib/admin";
import { assertCurrentAdminPermission } from "@/lib/auth/server";

export async function updateProblemReportAction(
  formData: FormData,
): Promise<never> {
  const reportId = textValue(formData.get("reportId"));
  let session;

  try {
    session = await assertCurrentAdminPermission("problem_reports:update");
  } catch {
    redirect("/access-denied");
  }

  const input = updateProblemReportInputSchema.safeParse({
    reportId,
    status: optionalValue(formData.get("status")),
    severity: optionalValue(formData.get("severity")),
    assignedAdminId: nullableValue(formData.get("assignedAdminId")),
    internalNote: optionalValue(formData.get("internalNote")),
    resolution: optionalValue(formData.get("resolution")),
    reason: textValue(formData.get("reason")),
    actor: {
      id: session.userId,
      displayName: session.displayName,
      role: session.role,
    },
  });

  if (!input.success) {
    redirect(
      `/problem-reports/${encodeURIComponent(reportId)}?error=validation`,
    );
  }

  const result = await getAdminService().updateProblemReportMock(input.data);
  if (!result.ok) {
    const params = new URLSearchParams({
      error: result.error.code.toLowerCase(),
      correlation: result.error.correlationId,
    });
    redirect(
      `/problem-reports/${encodeURIComponent(reportId)}?${params.toString()}`,
    );
  }

  revalidatePath(`/problem-reports/${reportId}`);
  revalidatePath("/problem-reports");
  revalidatePath("/audit-log");
  revalidatePath("/overview");
  redirect(`/problem-reports/${encodeURIComponent(reportId)}?updated=1`);
}

function textValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalValue(value: FormDataEntryValue | null): string | undefined {
  const text = textValue(value);
  return text.length > 0 ? text : undefined;
}

function nullableValue(
  value: FormDataEntryValue | null,
): string | null | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim() || null;
}
