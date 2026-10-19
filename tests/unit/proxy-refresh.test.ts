import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

/**
 * The lead's R16 admin review, MED 2 (Operations' 3efc961): adm_at's cookie
 * ends with its token, so an admin active past the hour arrives without it.
 * The proxy then refreshes from adm_rt inside the 30-minute idle; idle, no
 * adm_rt, or a refused refresh goes to the sign-in with every cookie
 * cleared, and the session is revoked where it still can be.
 */

const AUTH = "https://kitamo-auth.example";
const START = Date.UTC(2026, 9, 14, 2, 0, 0);
const token = (exp: number) =>
  `h.${Buffer.from(JSON.stringify({ exp, aal: "aal2" })).toString("base64url")}.s`;

type Call = { url: string; auth: string | null; body: unknown };
let calls: Call[] = [];
let refreshAnswer: () => Response;

beforeEach(() => {
  calls = [];
  vi.useFakeTimers();
  vi.setSystemTime(START + 62 * 60_000);
  vi.stubEnv("KITAMO_SUPABASE_URL", AUTH);
  vi.stubEnv("KITAMO_SUPABASE_ANON_KEY", "anon");
  const fresh = Math.floor((START + 62 * 60_000) / 1000) + 3600;
  refreshAnswer = () =>
    Response.json({
      access_token: token(fresh),
      refresh_token: "refresh-2",
      expires_at: fresh,
    });
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      calls.push({
        url,
        auth: headers.get("authorization"),
        body:
          init?.body === undefined ? undefined : JSON.parse(String(init.body)),
      });
      if (url.includes("grant_type=refresh_token")) return refreshAnswer();
      if (url.endsWith("/auth/v1/logout?scope=local"))
        return new Response(null, { status: 204 });
      return new Response("{}", { status: 404 });
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function request(cookies: Record<string, string>, path = "/flags") {
  return new NextRequest(`https://admin.kitamo.online${path}`, {
    headers: {
      cookie: Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
    },
  });
}

const now = () => Date.now();

describe("the proxy past the token's hour", () => {
  it("refreshes an admin active at minute 62 with no adm_at (adm_rt and a fresh adm_seen)", async () => {
    const response = await proxy(
      request({ adm_rt: "refresh-1", adm_seen: String(now() - 8 * 60_000) }),
    );
    expect(response.status).toBe(200);
    expect(calls.map((call) => call.url)).toEqual([
      `${AUTH}/auth/v1/token?grant_type=refresh_token`,
    ]);
    expect(calls[0]?.body).toEqual({ refresh_token: "refresh-1" });
    expect(response.cookies.get("adm_rt")?.value).toBe("refresh-2");
    expect(response.cookies.get("adm_at")?.value).toMatch(/^h\./);
    expect(response.cookies.get("adm_at")?.httpOnly).toBe(true);
    // The page reads the new token (the request's cookies are forwarded).
    expect(response.headers.get("x-middleware-request-cookie")).toContain(
      "adm_at=",
    );
  });

  it("leaves a live token alone", async () => {
    const response = await proxy(
      request({
        adm_at: token(Math.floor(now() / 1000) + 1800),
        adm_rt: "refresh-1",
        adm_seen: String(now() - 60_000),
      }),
    );
    expect(response.status).toBe(200);
    expect(calls).toEqual([]);
  });

  it("sends an admin idle 31 minutes to the sign-in, revoking by the refresh token, no new session", async () => {
    const response = await proxy(
      request({ adm_rt: "refresh-1", adm_seen: String(now() - 31 * 60_000) }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://admin.kitamo.online/sign-in?why=idle",
    );
    for (const name of ["adm_at", "adm_rt", "adm_seen"]) {
      expect(response.cookies.get(name)?.value).toBe("");
    }
    // The revocation: a refresh for a bearer, then the sign-out with it.
    expect(calls.map((call) => call.url)).toEqual([
      `${AUTH}/auth/v1/token?grant_type=refresh_token`,
      // scope=local: only this session ends (no scope is global, gate 0, 2026-10-20).
      `${AUTH}/auth/v1/logout?scope=local`,
    ]);
    expect(calls[1]?.auth).toMatch(/^Bearer h\./);
  });

  it("sends a request with no adm_rt to the sign-in, and calls nothing", async () => {
    const response = await proxy(
      request({
        adm_at: token(Math.floor(now() / 1000) + 1800),
        adm_seen: String(now()),
      }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://admin.kitamo.online/sign-in?returnTo=%2Fflags",
    );
    expect(calls).toEqual([]);
  });

  it("a refused refresh: the sign-in, every cookie cleared, the revocation attempted", async () => {
    refreshAnswer = () =>
      Response.json({ error_code: "refresh_token_not_found" }, { status: 400 });
    const response = await proxy(
      request({ adm_rt: "refresh-1", adm_seen: String(now() - 60_000) }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://admin.kitamo.online/sign-in?why=expired",
    );
    for (const name of ["adm_at", "adm_rt", "adm_seen"]) {
      expect(response.cookies.get(name)?.value).toBe("");
    }
    expect(
      calls.filter((call) => call.url.includes("grant_type=refresh_token")),
    ).toHaveLength(2);
  });

  it("a failed refresh (Auth unreachable) also goes to the sign-in with the cookies cleared", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    const response = await proxy(
      request({ adm_rt: "refresh-1", adm_seen: String(now() - 60_000) }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://admin.kitamo.online/sign-in?why=expired",
    );
    expect(response.cookies.get("adm_rt")?.value).toBe("");
  });
});
