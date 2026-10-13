import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  IDLE_MS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_S,
  SEEN_COOKIE,
  accessCookieMaxAge,
  cookieOptions,
  type AuthTokens,
} from "./session";

/** The session routes' replies: JSON, never cached, English (internal site). */
export function reply(status: number, body: unknown): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function refuse(status: number, message: string): NextResponse {
  return reply(status, { error: { message } });
}

/** CSRF: the browser's Origin must be this host (Vercel sets the forwarded host). */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return false;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  return [
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
    new URL(request.url).host,
  ].includes(host);
}

/** The access cookie from a route handler's request. */
export function accessTokenOf(request: Request): string | undefined {
  const cookie = request.headers.get("cookie") ?? "";
  const match = new RegExp(`(?:^|;\\s*)${ACCESS_COOKIE}=([^;]+)`).exec(cookie);
  if (match?.[1] === undefined) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}

/** Host-only httpOnly cookies for a fresh pair of tokens. */
export function setSessionCookies(
  response: NextResponse,
  tokens: AuthTokens,
  nowMs = Date.now(),
): NextResponse {
  response.cookies.set(
    ACCESS_COOKIE,
    tokens.access_token,
    cookieOptions(accessCookieMaxAge(tokens, nowMs)),
  );
  response.cookies.set(
    REFRESH_COOKIE,
    tokens.refresh_token,
    cookieOptions(REFRESH_COOKIE_MAX_AGE_S),
  );
  response.cookies.set(
    SEEN_COOKIE,
    String(nowMs),
    cookieOptions(IDLE_MS / 1000 + 60),
  );
  return response;
}
