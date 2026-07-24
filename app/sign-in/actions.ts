"use server";

import { redirect } from "next/navigation";

import { setDevelopmentAdminRole } from "@/lib/auth/mock-session.server";

export async function signInWithDevelopmentRole(
  formData: FormData,
): Promise<never> {
  const role = formData.get("role");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  await setDevelopmentAdminRole(role);
  redirect(returnTo);
}

export async function switchDevelopmentRole(
  formData: FormData,
): Promise<never> {
  const role = formData.get("role");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  await setDevelopmentAdminRole(role);
  redirect(returnTo);
}

function safeReturnTo(value: FormDataEntryValue | null): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/overview";
  }

  try {
    const parsed = new URL(value, "https://admin.kitamo.online");
    if (parsed.origin !== "https://admin.kitamo.online") {
      return "/overview";
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/overview";
  }
}
