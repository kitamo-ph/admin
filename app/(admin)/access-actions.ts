"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { safeReturnTo } from "@/lib/auth/kitamo/resolve";
import {
  AdminAuthenticationError,
  assertCurrentAdmin,
} from "@/lib/auth/server";

/** The banner's Close (close_admin_access). Core checks that it is this admin's access. */
export async function closeAccessAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formData.get("returnTo"));
  let context;
  try {
    context = await assertCurrentAdmin("business_access:open");
  } catch (error) {
    if (error instanceof AdminAuthenticationError) {
      redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
    }
    redirect("/access-denied");
  }
  const accessId = formData.get("accessId");
  const requestId = formData.get("requestId");
  const result = await context.service.closeAccess({
    accessId: typeof accessId === "string" ? accessId : "",
    clientRequestId: typeof requestId === "string" ? requestId : "",
  });
  if (!result.ok && result.error.code === "UNAUTHORIZED") {
    redirect("/sign-in?why=expired");
  }
  // The banner is in the shared layout: refresh it along with the page.
  revalidatePath("/", "layout");
  redirect(
    result.ok
      ? withNotice(returnTo, "closed")
      : withNotice(returnTo, "close_failed"),
  );
}

function withNotice(path: string, notice: string): string {
  const url = new URL(path, "https://admin.kitamo.online");
  url.searchParams.set("notice", notice);
  return `${url.pathname}${url.search}`;
}
