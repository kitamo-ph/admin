/**
 * The admin site's sign-in (R16, ADM-048), copied from Operations' console
 * (service/lib/console/session.ts at dbe4ca6): email and password against
 * KitaMo's Auth with Turnstile, kept in host-only httpOnly cookies. Plain
 * fetch to Auth's REST (no SDK, no new dependency). Staff are anonymous
 * users and are refused (the ES256 check, without allowAnonymous). After 30
 * minutes idle the site asks for the password again.
 *
 * Added for the admin site: the MFA steps (TOTP enroll, challenge, verify)
 * through Auth's /factors endpoints, the same REST calls
 * supabase.auth.mfa.enroll/challenge/verify make, so the session is aal2.
 */

export const ACCESS_COOKIE = "adm_at";
export const REFRESH_COOKIE = "adm_rt";
export const SEEN_COOKIE = "adm_seen";
export const SESSION_COOKIES = [
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SEEN_COOKIE,
] as const;
export const IDLE_MS = 30 * 60_000;
/** Refresh the access token when it has less than this left. */
export const REFRESH_EARLY_S = 120;
export const REFRESH_COOKIE_MAX_AGE_S = 12 * 3600;
export const TOTP_FRIENDLY_NAME = "KitaMo Admin";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export type AuthFailure =
  "invalid_credentials" | "captcha_failed" | "unavailable";

export function cookieOptions(maxAgeS: number) {
  return {
    httpOnly: true,
    // Host-only: no Domain attribute, so only admin.kitamo.online reads it.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeS,
  };
}

/** The access cookie's lifetime: the token's own, at least a minute. */
export function accessCookieMaxAge(tokens: AuthTokens, nowMs = Date.now()) {
  return Math.max(60, tokens.expires_at - Math.floor(nowMs / 1000));
}

/** True when the last activity is more than 30 minutes ago (or unknown). */
export function idleExpired(seen: string | undefined, now: number): boolean {
  if (seen === undefined || !/^\d{10,16}$/.test(seen)) return true;
  return now - Number(seen) > IDLE_MS;
}

/** The token's exp claim, read without trusting it (the ES256 check comes later). */
export function tokenExpiry(token: string): number | null {
  const claims = unverifiedClaims(token);
  return typeof claims?.exp === "number" ? claims.exp : null;
}

/** True when the token should be refreshed before use. */
export function needsRefresh(token: string, nowMs: number): boolean {
  const expiry = tokenExpiry(token);
  return expiry === null || expiry - REFRESH_EARLY_S < nowMs / 1000;
}

function unverifiedClaims(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  if (part === undefined) return null;
  try {
    const value: unknown = JSON.parse(
      Buffer.from(part, "base64url").toString("utf8"),
    );
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function authBase(
  env: NodeJS.ProcessEnv = process.env,
): { url: string; anon: string } | null {
  const url = env.KITAMO_SUPABASE_URL;
  const anon = env.KITAMO_SUPABASE_ANON_KEY;
  if (url === undefined || url === "" || anon === undefined || anon === "")
    return null;
  return { url: url.replace(/\/+$/, ""), anon };
}

function tokensOf(body: unknown): AuthTokens | null {
  if (body === null || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  if (
    typeof value.access_token !== "string" ||
    typeof value.refresh_token !== "string"
  )
    return null;
  const expiresAt =
    typeof value.expires_at === "number"
      ? value.expires_at
      : (tokenExpiry(value.access_token) ??
        Math.floor(Date.now() / 1000) + 3600);
  return {
    access_token: value.access_token,
    refresh_token: value.refresh_token,
    expires_at: expiresAt,
  };
}

function errorCodeOf(body: unknown): string {
  return body !== null && typeof body === "object" && "error_code" in body
    ? String(body.error_code)
    : "";
}

export async function passwordSignIn(
  email: string,
  password: string,
  captchaToken: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<AuthTokens | AuthFailure> {
  const base = authBase(env);
  if (base === null) return "unavailable";
  let response: Response;
  try {
    response = await fetchImpl(
      `${base.url}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: { apikey: base.anon, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          gotrue_meta_security: { captcha_token: captchaToken },
        }),
        signal: AbortSignal.timeout(6_000),
        cache: "no-store",
      },
    );
  } catch {
    return "unavailable";
  }
  const body: unknown = await response.json().catch(() => null);
  if (response.ok) return tokensOf(body) ?? "unavailable";
  const code = errorCodeOf(body);
  if (code === "captcha_failed") return "captcha_failed";
  if (response.status >= 500) return "unavailable";
  return "invalid_credentials";
}

export async function refreshSession(
  refreshToken: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<AuthTokens | null> {
  const base = authBase(env);
  if (base === null) return null;
  try {
    const response = await fetchImpl(
      `${base.url}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: { apikey: base.anon, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: AbortSignal.timeout(4_000),
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    return tokensOf(await response.json());
  } catch {
    return null;
  }
}

/** Ends the Auth session (best effort): the refresh token stops working. */
export async function signOutSession(
  accessToken: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const base = authBase(env);
  if (base === null) return;
  try {
    // scope=local: this session only. Auth's /logout without a scope is GLOBAL (gate 0, 2026-10-20):
    // it would sign the person out of KitaMo and every other device too.
    await fetchImpl(`${base.url}/auth/v1/logout?scope=local`, {
      method: "POST",
      headers: { apikey: base.anon, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(3_000),
      cache: "no-store",
    });
  } catch {
    // The cookies go anyway; an Auth session left behind expires on its own.
  }
}

/**
 * Revokes a refresh token when no access token is at hand (best effort):
 * GoTrue ends a session only for a bearer, so the refresh token buys one
 * live access token, which then signs the session out. A token Auth already
 * refuses is dead anyway. (The lead's R16 admin review, MED 2.)
 */
export async function revokeRefreshToken(
  refreshToken: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const tokens = await refreshSession(refreshToken, env, fetchImpl);
  if (tokens !== null)
    await signOutSession(tokens.access_token, env, fetchImpl);
}

// ---------------------------------------------------------------------------
// MFA (TOTP) through Auth's REST: GET /user, POST /factors,
// DELETE /factors/{id}, POST /factors/{id}/challenge, POST /factors/{id}/verify.

export interface TotpFactor {
  id: string;
  status: "verified" | "unverified";
}

export type MfaFailure =
  /** The project's TOTP is switched off (422 mfa_totp_enroll_not_enabled). */
  | "totp_disabled"
  /** The code was wrong or too old (422 mfa_verification_failed and kin). */
  | "code_rejected"
  /** The token is no longer accepted (401/403): sign in again. */
  | "signed_out"
  | "unavailable";

export interface TotpEnrollment {
  factorId: string;
  /** An SVG data URI from Auth; rendered only as an <img>. */
  qrCode: string;
  secret: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authCall(
  path: string,
  init: { method: "GET" | "POST" | "DELETE"; token: string; body?: unknown },
  env: NodeJS.ProcessEnv,
  fetchImpl: typeof fetch,
): Promise<{ status: number; body: unknown } | null> {
  const base = authBase(env);
  if (base === null) return null;
  try {
    const response = await fetchImpl(`${base.url}/auth/v1${path}`, {
      method: init.method,
      headers: {
        apikey: base.anon,
        Authorization: `Bearer ${init.token}`,
        ...(init.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      signal: AbortSignal.timeout(6_000),
      cache: "no-store",
    });
    const body: unknown = await response.json().catch(() => null);
    return { status: response.status, body };
  } catch {
    return null;
  }
}

function failureOf(result: { status: number; body: unknown }): MfaFailure {
  if (result.status === 401 || result.status === 403) return "signed_out";
  const code = errorCodeOf(result.body);
  if (code === "mfa_totp_enroll_not_enabled") return "totp_disabled";
  if (result.status === 422 || result.status === 400 || code.startsWith("mfa_"))
    return "code_rejected";
  return "unavailable";
}

export type MfaStep =
  "token" | "list" | "unenroll" | "enroll" | "challenge" | "verify" | "aal2";

/**
 * One server log line per failed MFA step: the step, Auth's HTTP status (0
 * when Auth did not answer: network, timeout or no Auth settings), Auth's
 * error_code, and a short detail such as which field of a 200 reply was
 * refused. Never the token, the secret, the QR code or the reply body.
 */
export function logMfaFailure(
  step: MfaStep,
  status: number,
  errorCode: string,
  detail?: string,
): void {
  const code =
    errorCode === ""
      ? "none"
      : /^[A-Za-z0-9_]{1,64}$/.test(errorCode)
        ? errorCode
        : "other";
  console.error(
    `KitaMo Admin MFA failure: step=${step} status=${status} error_code=${code}` +
      (detail === undefined ? "" : ` detail=${detail}`),
  );
}

/** Logs the failed step once, then maps it as failureOf does. */
function failed(
  step: MfaStep,
  result: { status: number; body: unknown } | null,
  detail?: string,
): MfaFailure {
  logMfaFailure(
    step,
    result?.status ?? 0,
    result === null ? "" : errorCodeOf(result.body),
    result === null ? "no_answer" : detail,
  );
  return result === null || detail !== undefined
    ? "unavailable"
    : failureOf(result);
}

/** The user's TOTP factors (GET /auth/v1/user → factors[]). */
export async function listTotpFactors(
  accessToken: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<TotpFactor[] | MfaFailure> {
  const result = await authCall(
    "/user",
    { method: "GET", token: accessToken },
    env,
    fetchImpl,
  );
  if (result === null || result.status !== 200) return failed("list", result);
  const factors = (result.body as { factors?: unknown } | null)?.factors;
  if (factors === undefined || factors === null) return [];
  if (!Array.isArray(factors)) return failed("list", result, "bad_factors");
  return factors.flatMap((factor: unknown) => {
    if (factor === null || typeof factor !== "object") return [];
    const value = factor as Record<string, unknown>;
    if (
      value.factor_type !== "totp" ||
      typeof value.id !== "string" ||
      !UUID.test(value.id) ||
      (value.status !== "verified" && value.status !== "unverified")
    )
      return [];
    return [{ id: value.id, status: value.status }];
  });
}

/** Removes an unverified factor left by an earlier, unfinished setup. */
export async function unenrollFactor(
  accessToken: string,
  factorId: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!UUID.test(factorId)) return false;
  const result = await authCall(
    `/factors/${factorId}`,
    { method: "DELETE", token: accessToken },
    env,
    fetchImpl,
  );
  if (result !== null && result.status >= 200 && result.status < 300)
    return true;
  failed("unenroll", result);
  return false;
}

/** POST /auth/v1/factors {factor_type: 'totp'}: the QR code and secret. */
export async function enrollTotp(
  accessToken: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<TotpEnrollment | MfaFailure> {
  const result = await authCall(
    "/factors",
    {
      method: "POST",
      token: accessToken,
      body: {
        factor_type: "totp",
        friendly_name: TOTP_FRIENDLY_NAME,
        issuer: TOTP_FRIENDLY_NAME,
      },
    },
    env,
    fetchImpl,
  );
  if (result === null || (result.status !== 200 && result.status !== 201))
    return failed("enroll", result);
  const body = result.body as {
    id?: unknown;
    totp?: { qr_code?: unknown; secret?: unknown };
  } | null;
  const id = body?.id;
  const secret = body?.totp?.secret;
  if (typeof id !== "string" || !UUID.test(id))
    return failed("enroll", result, "bad_id");
  const qrCode = safeQrCode(body?.totp?.qr_code);
  if (qrCode === null) return failed("enroll", result, "bad_qr_code");
  // GoTrue's secret is base32 without padding (32 characters for its 20 bytes).
  if (typeof secret !== "string" || !/^[A-Z2-7=]{16,128}$/.test(secret))
    return failed("enroll", result, "bad_secret");
  return { factorId: id, qrCode, secret };
}

/**
 * The longest QR code accepted. GoTrue draws one <rect> per QR module (about
 * 72 characters each): the admin's otpauth URI at error level H is a 65×65
 * code, about 310 KB. A million characters is room for 117×117.
 */
const QR_CODE_MAX = 1_000_000;

/**
 * Auth's REST reply carries the QR code as the SVG document itself (auth-js
 * adds `data:image/svg+xml;utf-8,` in the browser); a data URI is accepted
 * too. Only an SVG is accepted, re-encoded as a data URI that is a valid URL
 * for <img src>, where it is only ever shown.
 */
export function safeQrCode(value: unknown): string | null {
  if (typeof value !== "string" || value.length > QR_CODE_MAX) return null;
  const svgUri = (svg: string) =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  if (startsAsSvg(value)) return svgUri(value);
  const match = /^data:image\/svg\+xml(;[a-z0-9=-]+)*,([\s\S]+)$/i.exec(value);
  if (match === null) return null;
  const encoded = /;base64(;|$)/i.test(match[1] ?? "");
  if (encoded) {
    const data = match[2] ?? "";
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;
    if (!startsAsSvg(Buffer.from(data, "base64").toString("utf8"))) return null;
    return `data:image/svg+xml;base64,${data}`;
  }
  let svg = match[2] ?? "";
  try {
    svg = decodeURIComponent(svg);
  } catch {
    // Not percent-encoded: use it as it is.
  }
  return startsAsSvg(svg) ? svgUri(svg) : null;
}

/**
 * True when the text is an SVG document: an optional XML declaration, then
 * any number of comments and whitespace, then `<svg`. GoTrue's SVGo starts
 * with `<?xml version="1.0"?>` and `<!-- Generated by SVGo -->`. A plain scan
 * rather than a regex, so a long reply cannot make it backtrack.
 */
function startsAsSvg(text: string): boolean {
  let at = skipSpace(text, 0);
  if (text.startsWith("<?xml", at)) {
    const end = text.indexOf("?>", at);
    if (end === -1) return false;
    at = skipSpace(text, end + 2);
  }
  while (text.startsWith("<!--", at)) {
    const end = text.indexOf("-->", at + 4);
    if (end === -1) return false;
    at = skipSpace(text, end + 3);
  }
  return /^<svg[\s>]/i.test(text.slice(at, at + 5));
}

function skipSpace(text: string, at: number): number {
  let next = at;
  while (next < text.length && /\s/.test(text.charAt(next))) next += 1;
  return next;
}

/** POST /factors/{id}/challenge then /verify: new tokens at aal2. */
export async function challengeAndVerify(
  accessToken: string,
  factorId: string,
  code: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<AuthTokens | MfaFailure> {
  if (!UUID.test(factorId) || !/^\d{6}$/.test(code)) return "code_rejected";
  const challenge = await authCall(
    `/factors/${factorId}/challenge`,
    { method: "POST", token: accessToken, body: {} },
    env,
    fetchImpl,
  );
  if (
    challenge === null ||
    (challenge.status !== 200 && challenge.status !== 201)
  )
    return failed("challenge", challenge);
  const challengeId = (challenge.body as { id?: unknown } | null)?.id;
  if (typeof challengeId !== "string" || !UUID.test(challengeId))
    return failed("challenge", challenge, "bad_challenge_id");
  const verify = await authCall(
    `/factors/${factorId}/verify`,
    {
      method: "POST",
      token: accessToken,
      body: { challenge_id: challengeId, code },
    },
    env,
    fetchImpl,
  );
  if (verify === null || verify.status !== 200) return failed("verify", verify);
  return tokensOf(verify.body) ?? failed("verify", verify, "bad_tokens");
}
