import { z } from "zod";

import {
  accessTokenOf,
  refuse,
  reply,
  sameOrigin,
  setSessionCookies,
} from "@/lib/auth/kitamo/http";
import { isAal2, verifyKitamoToken } from "@/lib/auth/kitamo/login";
import {
  challengeAndVerify,
  listTotpFactors,
  logMfaFailure,
  signOutSession,
} from "@/lib/auth/kitamo/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Verify = z.strictObject({
  factorId: z.guid(),
  code: z.string().regex(/^\d{6}$/),
});

/**
 * The authenticator step (spec §5.1 step 3): challenge and verify the TOTP
 * factor, which returns new tokens at aal2. The factor must be this user's
 * own TOTP factor, as KitaMo's Auth lists it. Each failed step writes one
 * server log line (logMfaFailure).
 */
export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) {
    return refuse(403, "Open the admin site and try again.");
  }
  const parsed = Verify.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return refuse(400, "Enter the 6-digit code from your authenticator app.");
  }
  const access = accessTokenOf(request);
  if (access === undefined) {
    return refuse(401, "Your sign-in has ended. Sign in again.");
  }
  const check = await verifyKitamoToken(access);
  if (!check.ok) {
    logMfaFailure("token", 0, "", check.reason);
    return check.reason === "refused"
      ? refuse(401, "Your sign-in has ended. Sign in again.")
      : refuse(503, "KitaMo sign-in is not answering. Try again in a moment.");
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
  if (!factors.some((factor) => factor.id === parsed.data.factorId)) {
    logMfaFailure("list", 200, "", "factor_not_listed");
    return refuse(400, "Set up the authenticator app again.");
  }
  const result = await challengeAndVerify(
    access,
    parsed.data.factorId,
    parsed.data.code,
  );
  if (result === "code_rejected") {
    return refuse(
      422,
      "That code didn't match. Check the time on your phone and try the newest code.",
    );
  }
  if (result === "signed_out") {
    return refuse(401, "Your sign-in has ended. Sign in again.");
  }
  if (result === "totp_disabled") {
    return refuse(
      422,
      "Authenticator-app sign-in is switched off for KitaMo's Auth. Ask the lead to turn on TOTP (Authentication → Multi-Factor).",
    );
  }
  if (result === "unavailable") {
    return refuse(
      503,
      "KitaMo sign-in is not answering. Try again in a moment.",
    );
  }
  const upgraded = await verifyKitamoToken(result.access_token);
  if (!upgraded.ok || !isAal2(upgraded.claims)) {
    logMfaFailure("aal2", 0, "", upgraded.ok ? "not_aal2" : upgraded.reason);
    await signOutSession(result.access_token);
    return refuse(
      503,
      "The authenticator step did not complete. Sign in again.",
    );
  }
  return setSessionCookies(reply(200, { ok: true }), result);
}
