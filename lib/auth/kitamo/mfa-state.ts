import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isAal2, verifyKitamoToken } from "./login";
import { safeReturnTo } from "./resolve";
import { ACCESS_COOKIE, listTotpFactors, type TotpFactor } from "./session";

/**
 * The MFA pages' gate: a KitaMo password session (aal1) that has passed the
 * ES256 check. aal2 already → on to the admin site.
 */
export async function requireMfaStep(returnToInput: unknown): Promise<{
  factors: TotpFactor[];
  returnTo: string;
}> {
  const returnTo = safeReturnTo(returnToInput);
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (token === undefined || token === "") {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }
  const check = await verifyKitamoToken(token);
  if (!check.ok) {
    redirect(
      check.reason === "refused" ? "/sign-in?why=expired" : "/unavailable",
    );
  }
  if (isAal2(check.claims)) redirect(returnTo);
  const factors = await listTotpFactors(token);
  if (factors === "signed_out") redirect("/sign-in?why=expired");
  if (!Array.isArray(factors)) redirect("/unavailable");
  return { factors, returnTo };
}
