import {
  accessTokenOf,
  refuse,
  reply,
  sameOrigin,
} from "@/lib/auth/kitamo/http";
import { isAal2, verifyKitamoToken } from "@/lib/auth/kitamo/login";
import {
  enrollTotp,
  listTotpFactors,
  unenrollFactor,
} from "@/lib/auth/kitamo/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sets up the authenticator app (spec §5.1 step 3): POST /auth/v1/factors
 * {factor_type: 'totp'} and its QR code. Only when the account has no
 * verified TOTP factor; an unfinished earlier setup is removed first.
 * Nothing here says whether the account is the admin: Core decides that at
 * aal2.
 */
export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) {
    return refuse(403, "Open the admin site and try again.");
  }
  const access = accessTokenOf(request);
  if (access === undefined) {
    return refuse(401, "Your sign-in has ended. Sign in again.");
  }
  const check = await verifyKitamoToken(access);
  if (!check.ok) {
    return check.reason === "refused"
      ? refuse(401, "Your sign-in has ended. Sign in again.")
      : refuse(503, "KitaMo sign-in is not answering. Try again in a moment.");
  }
  if (isAal2(check.claims)) {
    return refuse(409, "The authenticator app is already set up.");
  }
  const factors = await listTotpFactors(access);
  if (factors === "signed_out") {
    return refuse(401, "Your sign-in has ended. Sign in again.");
  }
  if (!Array.isArray(factors)) {
    return refuse(
      503,
      "KitaMo sign-in is not answering. Try again in a moment.",
    );
  }
  if (factors.some((factor) => factor.status === "verified")) {
    return refuse(
      409,
      "The authenticator app is already set up. Enter its code.",
    );
  }
  for (const factor of factors) {
    await unenrollFactor(access, factor.id);
  }
  const enrollment = await enrollTotp(access);
  if (enrollment === "totp_disabled") {
    return refuse(
      422,
      "Authenticator-app sign-in is switched off for KitaMo's Auth. Ask the lead to turn on TOTP (Authentication → Multi-Factor).",
    );
  }
  if (enrollment === "signed_out") {
    return refuse(401, "Your sign-in has ended. Sign in again.");
  }
  if (typeof enrollment === "string") {
    return refuse(
      503,
      "KitaMo sign-in is not answering. Try again in a moment.",
    );
  }
  return reply(200, enrollment);
}
