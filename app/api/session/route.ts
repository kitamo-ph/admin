import { z } from "zod";

import { captchaConfiguration } from "@/lib/auth/kitamo/captcha";
import {
  accessTokenOf,
  refreshTokenOf,
  refuse,
  reply,
  sameOrigin,
  setSessionCookies,
} from "@/lib/auth/kitamo/http";
import { verifyKitamoToken } from "@/lib/auth/kitamo/login";
import {
  SESSION_COOKIES,
  cookieOptions,
  passwordSignIn,
  revokeRefreshToken,
  signOutSession,
} from "@/lib/auth/kitamo/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Credentials = z.strictObject({
  email: z.email().max(320),
  password: z.string().min(1).max(1024),
  captchaToken: z.string().min(1).max(2048).optional(),
});

/**
 * Sign in (spec §5.1 step 1, copied from Operations' console at dbe4ca6):
 * Turnstile, then KitaMo's Auth, then the ES256 check (no anonymous: staff
 * are refused). The result is an aal1 session; the authenticator step comes
 * next, and Core decides whether this account is the admin.
 */
export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) {
    return refuse(403, "Open the sign-in page and try again.");
  }
  const parsed = Credentials.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return refuse(400, "Enter your email and password.");
  }
  const captcha = captchaConfiguration();
  if (captcha.mode === "unavailable") {
    return refuse(503, "Sign-in is not available right now. Try again later.");
  }
  const token =
    captcha.mode === "local-test"
      ? (process.env.KITAMO_AUTH_TEST_CAPTCHA_TOKEN ?? "")
      : parsed.data.captchaToken;
  if (token === undefined || token === "") {
    return refuse(400, "Complete the security check to continue.");
  }
  const result = await passwordSignIn(
    parsed.data.email,
    parsed.data.password,
    token,
  );
  if (result === "captcha_failed") {
    return refuse(
      422,
      "The security check could not be verified. Try it again.",
    );
  }
  if (result === "unavailable") {
    return refuse(
      503,
      "KitaMo sign-in is not answering. Try again in a moment.",
    );
  }
  if (result === "invalid_credentials") {
    return refuse(401, "That email and password don't match a KitaMo account.");
  }
  const check = await verifyKitamoToken(result.access_token);
  if (!check.ok) {
    await signOutSession(result.access_token);
    return check.reason === "refused"
      ? refuse(401, "Use KitaMo's admin account here.")
      : refuse(503, "Sign-in is not available right now.");
  }
  return setSessionCookies(reply(200, { ok: true, next: "/mfa" }), result);
}

/** Sign out: ends the Auth session (best effort) and clears every session cookie. */
export async function DELETE(request: Request): Promise<Response> {
  if (!sameOrigin(request)) {
    return refuse(403, "Open the admin site and try again.");
  }
  const access = accessTokenOf(request);
  const refresh = refreshTokenOf(request);
  // An admin past the token's hour has no adm_at: the refresh token revokes the session.
  if (access !== undefined) await signOutSession(access);
  else if (refresh !== undefined) await revokeRefreshToken(refresh);
  const response = reply(200, { ok: true });
  for (const name of SESSION_COOKIES) {
    response.cookies.set(name, "", cookieOptions(0));
  }
  return response;
}
