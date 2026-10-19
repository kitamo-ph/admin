import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockAdminService } from "@/lib/admin";
import type { AdminService } from "@/lib/admin/service";
import type { TokenCheck } from "@/lib/auth/kitamo/login";
import {
  redirectFor,
  resolveKitamoSession,
  safeReturnTo,
} from "@/lib/auth/kitamo/resolve";
import {
  IDLE_MS,
  challengeAndVerify,
  enrollTotp,
  idleExpired,
  listTotpFactors,
  needsRefresh,
  passwordSignIn,
  refreshSession,
  safeQrCode,
  unenrollFactor,
} from "@/lib/auth/kitamo/session";

const env = {
  KITAMO_SUPABASE_URL: "https://kitamo-test.supabase.co/",
  KITAMO_SUPABASE_ANON_KEY: "anon-test",
} as unknown as NodeJS.ProcessEnv;
const FACTOR = "11111111-1111-4111-8111-111111111111";
const CHALLENGE = "22222222-2222-4222-8222-222222222222";

type Seen = { url: string; method: string; headers: Headers; body: unknown };

/** A stubbed GoTrue: answers by path, records each call. */
function gotrue(
  routes: Record<string, (seen: Seen) => { status: number; body?: unknown }>,
) {
  const calls: Seen[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const seen: Seen = {
      url,
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body:
        init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    };
    calls.push(seen);
    const path = new URL(url).pathname + new URL(url).search;
    const route = Object.entries(routes).find(([key]) =>
      `${seen.method} ${path}`.startsWith(key),
    );
    if (route === undefined) return new Response("{}", { status: 404 });
    const reply = route[1](seen);
    return new Response(
      reply.body === undefined ? "" : JSON.stringify(reply.body),
      { status: reply.status },
    );
  };
  return { calls, fetchImpl };
}

function token(claims: Record<string, unknown>): string {
  return `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`;
}

const TOKENS = {
  access_token: token({ exp: 2_000_000_000 }),
  refresh_token: "refresh-1",
  expires_at: 2_000_000_000,
};

describe("password sign-in (copied from Operations' console)", () => {
  it("POSTs the password grant with the anon key and the Turnstile token", async () => {
    const stub = gotrue({
      "POST /auth/v1/token?grant_type=password": () => ({
        status: 200,
        body: TOKENS,
      }),
    });
    const result = await passwordSignIn(
      "admin@kitamo.test",
      "secret",
      "captcha-1",
      env,
      stub.fetchImpl,
    );
    expect(result).toEqual(TOKENS);
    expect(stub.calls[0]?.url).toBe(
      "https://kitamo-test.supabase.co/auth/v1/token?grant_type=password",
    );
    expect(stub.calls[0]?.headers.get("apikey")).toBe("anon-test");
    expect(stub.calls[0]?.body).toEqual({
      email: "admin@kitamo.test",
      password: "secret",
      gotrue_meta_security: { captcha_token: "captcha-1" },
    });
  });

  it("maps captcha, bad credentials and outages", async () => {
    const reply = (status: number, body: unknown) =>
      gotrue({
        "POST /auth/v1/token": () => ({ status, body }),
      }).fetchImpl;
    expect(
      await passwordSignIn(
        "a@b.co",
        "x",
        "c",
        env,
        reply(400, { error_code: "captcha_failed" }),
      ),
    ).toBe("captcha_failed");
    expect(
      await passwordSignIn(
        "a@b.co",
        "x",
        "c",
        env,
        reply(400, { error_code: "invalid_credentials" }),
      ),
    ).toBe("invalid_credentials");
    expect(await passwordSignIn("a@b.co", "x", "c", env, reply(502, {}))).toBe(
      "unavailable",
    );
    expect(
      await passwordSignIn("a@b.co", "x", "c", {} as NodeJS.ProcessEnv),
    ).toBe("unavailable");
  });

  it("refreshes a session, and answers null when Auth refuses", async () => {
    const good = gotrue({
      "POST /auth/v1/token?grant_type=refresh_token": () => ({
        status: 200,
        body: TOKENS,
      }),
    });
    expect(await refreshSession("refresh-0", env, good.fetchImpl)).toEqual(
      TOKENS,
    );
    expect(good.calls[0]?.body).toEqual({ refresh_token: "refresh-0" });
    const bad = gotrue({
      "POST /auth/v1/token": () => ({ status: 400, body: {} }),
    });
    expect(await refreshSession("refresh-0", env, bad.fetchImpl)).toBeNull();
  });
});

describe("the 30-minute idle and the early refresh", () => {
  it("expires after 30 minutes without activity, or with no record of it", () => {
    const now = Date.UTC(2026, 9, 14, 6, 0, 0);
    expect(idleExpired(String(now - IDLE_MS + 1_000), now)).toBe(false);
    expect(idleExpired(String(now - IDLE_MS - 1_000), now)).toBe(true);
    expect(idleExpired(undefined, now)).toBe(true);
    expect(idleExpired("yesterday", now)).toBe(true);
  });

  it("refreshes a token with less than 120 seconds left", () => {
    const now = 1_800_000_000_000;
    expect(needsRefresh(token({ exp: now / 1000 + 600 }), now)).toBe(false);
    expect(needsRefresh(token({ exp: now / 1000 + 60 }), now)).toBe(true);
    expect(needsRefresh("garbage", now)).toBe(true);
  });
});

/**
 * GoTrue's QR code as its REST reply carries it (internal/api/mfa.go:
 * qr.Encode(uri, qr.H), goqrsvg block size 3, SVGo): the document itself, no
 * data: prefix, one <rect> per module.
 */
function gotrueQr(modules: number): string {
  const rects: string[] = [];
  for (let x = 0; x < modules; x += 1)
    for (let y = 0; y < modules; y += 1)
      rects.push(
        `<rect x="${12 + y * 3}" y="${12 + x * 3}" width="3" height="3" style="fill:${(x * y) % 3 === 0 ? "black" : "white"};stroke:none" />\n`,
      );
  const width = modules * 3 + 3 * 8;
  return (
    `<?xml version="1.0"?>\n<!-- Generated by SVGo -->\n<svg width="${width}" height="${width}"\n` +
    `     xmlns="http://www.w3.org/2000/svg"\n     xmlns:xlink="http://www.w3.org/1999/xlink">\n` +
    `${rects.join("")}</svg>\n`
  );
}
const SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

describe("MFA through Auth's /factors REST", () => {
  let logged: string[] = [];
  beforeEach(() => {
    logged = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logged.push(args.map(String).join(" "));
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists only well-formed TOTP factors", async () => {
    const stub = gotrue({
      "GET /auth/v1/user": () => ({
        status: 200,
        body: {
          factors: [
            { id: FACTOR, factor_type: "totp", status: "verified" },
            { id: "not-a-uuid", factor_type: "totp", status: "verified" },
            { id: CHALLENGE, factor_type: "phone", status: "verified" },
          ],
        },
      }),
    });
    expect(await listTotpFactors("at", env, stub.fetchImpl)).toEqual([
      { id: FACTOR, status: "verified" },
    ]);
    expect(stub.calls[0]?.headers.get("authorization")).toBe("Bearer at");
    const signedOut = gotrue({
      "GET /auth/v1/user": () => ({ status: 401, body: {} }),
    });
    expect(await listTotpFactors("at", env, signedOut.fetchImpl)).toBe(
      "signed_out",
    );
  });

  it("enrolls TOTP with the admin's friendly name and returns a safe QR", async () => {
    const stub = gotrue({
      "POST /auth/v1/factors": () => ({
        status: 200,
        body: {
          id: FACTOR,
          type: "totp",
          totp: {
            qr_code:
              'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg"></svg>',
            secret: "JBSWY3DPEHPK3PXP",
            uri: "otpauth://totp/x",
          },
        },
      }),
    });
    const result = await enrollTotp("at", env, stub.fetchImpl);
    expect(stub.calls[0]?.body).toMatchObject({
      factor_type: "totp",
      friendly_name: "KitaMo Admin",
    });
    expect(result).toMatchObject({
      factorId: FACTOR,
      secret: "JBSWY3DPEHPK3PXP",
    });
    expect(typeof result === "object" && result.qrCode).toMatch(
      /^data:image\/svg\+xml;charset=utf-8,%3Csvg/,
    );
  });

  it("says plainly when the project's TOTP is switched off", async () => {
    const stub = gotrue({
      "POST /auth/v1/factors": () => ({
        status: 422,
        body: { error_code: "mfa_totp_enroll_not_enabled" },
      }),
    });
    expect(await enrollTotp("at", env, stub.fetchImpl)).toBe("totp_disabled");
  });

  it("challenges then verifies, and returns the aal2 tokens", async () => {
    const aal2 = {
      ...TOKENS,
      access_token: token({ aal: "aal2", exp: 2_000_000_000 }),
    };
    const stub = gotrue({
      [`POST /auth/v1/factors/${FACTOR}/challenge`]: () => ({
        status: 200,
        body: { id: CHALLENGE, type: "totp" },
      }),
      [`POST /auth/v1/factors/${FACTOR}/verify`]: (seen) =>
        (seen.body as { code?: string }).code === "123456"
          ? { status: 200, body: aal2 }
          : { status: 422, body: { error_code: "mfa_verification_failed" } },
    });
    expect(
      await challengeAndVerify("at", FACTOR, "123456", env, stub.fetchImpl),
    ).toEqual(aal2);
    expect(stub.calls[1]?.body).toEqual({
      challenge_id: CHALLENGE,
      code: "123456",
    });
    expect(
      await challengeAndVerify("at", FACTOR, "000000", env, stub.fetchImpl),
    ).toBe("code_rejected");
    // A malformed code or factor never reaches Auth.
    const before = stub.calls.length;
    expect(
      await challengeAndVerify("at", FACTOR, "12345", env, stub.fetchImpl),
    ).toBe("code_rejected");
    expect(
      await challengeAndVerify("at", "x", "123456", env, stub.fetchImpl),
    ).toBe("code_rejected");
    expect(stub.calls.length).toBe(before);
  });

  it("removes an unfinished factor by id only", async () => {
    const stub = gotrue({
      [`DELETE /auth/v1/factors/${FACTOR}`]: () => ({ status: 200, body: {} }),
    });
    expect(await unenrollFactor("at", FACTOR, env, stub.fetchImpl)).toBe(true);
    expect(await unenrollFactor("at", "../user", env, stub.fetchImpl)).toBe(
      false,
    );
    expect(stub.calls).toHaveLength(1);
  });

  it("accepts only an SVG as the QR code", () => {
    expect(safeQrCode("javascript:alert(1)")).toBeNull();
    expect(safeQrCode("data:text/html,<script>1</script>")).toBeNull();
    expect(safeQrCode("data:image/svg+xml;utf-8,<p>not svg</p>")).toBeNull();
    expect(safeQrCode("data:image/svg+xml;base64,PHN2Zz4=")).toBe(
      "data:image/svg+xml;base64,PHN2Zz4=",
    );
    // base64 of "<p>x</p>": decoded and refused.
    expect(safeQrCode("data:image/svg+xml;base64,PHA+eDwvcD4=")).toBeNull();
    expect(safeQrCode("<html><svg></svg></html>")).toBeNull();
    expect(safeQrCode('<?xml version="1.0"?><p>x</p>')).toBeNull();
    expect(safeQrCode("<!-- never closed <svg></svg>")).toBeNull();
    expect(safeQrCode("<!-- a --><p><svg></svg></p>")).toBeNull();
    expect(safeQrCode(42)).toBeNull();
  });

  it("accepts GoTrue's SVGo QR: the declaration, a comment, then <svg", () => {
    const svg =
      '<?xml version="1.0"?>\n<!-- Generated by SVGo -->\n<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg"></svg>';
    expect(safeQrCode(`data:image/svg+xml;utf-8,${svg}`)).toBe(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    );
    // The REST reply itself has no data: prefix (auth-js adds it).
    expect(safeQrCode(svg)).toBe(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    );
    expect(
      safeQrCode("<!-- one -->\n  <!-- two --><svg viewBox='0 0 1 1'/>"),
    ).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
  });

  it("enrolls with GoTrue's real reply: a full-size SVGo QR, no prefix", async () => {
    // The admin's otpauth URI (about 150 bytes) at level H is a 65×65 code.
    const qr = gotrueQr(65);
    expect(qr.length).toBeGreaterThan(64_000);
    const stub = gotrue({
      "POST /auth/v1/factors": () => ({
        status: 200,
        body: {
          id: FACTOR,
          type: "totp",
          friendly_name: "KitaMo Admin",
          totp: { qr_code: qr, secret: SECRET, uri: "otpauth://totp/x" },
        },
      }),
    });
    const result = await enrollTotp("at", env, stub.fetchImpl);
    expect(result).toEqual({
      factorId: FACTOR,
      qrCode: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`,
      secret: SECRET,
    });
    expect(logged).toEqual([]);
  });

  it("refuses an oversized QR, and scans a long reply without backtracking", () => {
    expect(safeQrCode(`<svg>${" ".repeat(1_000_000)}</svg>`)).toBeNull();
    const started = Date.now();
    expect(safeQrCode("<!---->".repeat(140_000))).toBeNull();
    expect(
      safeQrCode(`data:image/svg+xml,${"<!--".repeat(240_000)}`),
    ).toBeNull();
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it("logs one line per failed step: step, status, error_code, never the reply", async () => {
    const qrRefused = gotrue({
      "POST /auth/v1/factors": () => ({
        status: 200,
        body: {
          id: FACTOR,
          totp: { qr_code: "<p>not a QR</p>", secret: SECRET },
        },
      }),
    });
    expect(await enrollTotp("token-xyz", env, qrRefused.fetchImpl)).toBe(
      "unavailable",
    );
    expect(logged).toEqual([
      "KitaMo Admin MFA failure: step=enroll status=200 error_code=none detail=bad_qr_code",
    ]);

    logged = [];
    const disabled = gotrue({
      "POST /auth/v1/factors": () => ({
        status: 422,
        body: { error_code: "mfa_totp_enroll_not_enabled", msg: SECRET },
      }),
    });
    expect(await enrollTotp("token-xyz", env, disabled.fetchImpl)).toBe(
      "totp_disabled",
    );
    const badSecret = gotrue({
      "POST /auth/v1/factors": () => ({
        status: 200,
        body: { id: FACTOR, totp: { qr_code: gotrueQr(3), secret: "x" } },
      }),
    });
    expect(await enrollTotp("token-xyz", env, badSecret.fetchImpl)).toBe(
      "unavailable",
    );
    const down: typeof fetch = async () => {
      throw new Error("ECONNRESET token-xyz");
    };
    expect(
      await challengeAndVerify("token-xyz", FACTOR, "123456", env, down),
    ).toBe("unavailable");
    const odd = gotrue({
      "GET /auth/v1/user": () => ({
        status: 500,
        body: { error_code: "<b>weird code</b>" },
      }),
      [`DELETE /auth/v1/factors/${FACTOR}`]: () => ({ status: 404, body: {} }),
    });
    expect(await listTotpFactors("token-xyz", env, odd.fetchImpl)).toBe(
      "unavailable",
    );
    expect(await unenrollFactor("token-xyz", FACTOR, env, odd.fetchImpl)).toBe(
      false,
    );
    expect(logged).toEqual([
      "KitaMo Admin MFA failure: step=enroll status=422 error_code=mfa_totp_enroll_not_enabled",
      "KitaMo Admin MFA failure: step=enroll status=200 error_code=none detail=bad_secret",
      "KitaMo Admin MFA failure: step=challenge status=0 error_code=none detail=no_answer",
      "KitaMo Admin MFA failure: step=list status=500 error_code=other",
      "KitaMo Admin MFA failure: step=unenroll status=404 error_code=none",
    ]);
    expect(logged.join("\n")).not.toMatch(/token-xyz|JBSWY3DP|<svg|<p>/);
  });
});

describe("the per-request session decision (spec §5.1 step 4)", () => {
  const now = Date.UTC(2026, 9, 14, 7, 0, 0);
  const seen = String(now - 60_000);
  const claims = (extra: Record<string, unknown>): TokenCheck => ({
    ok: true,
    claims: {
      sub: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      iss: "x",
      aud: "authenticated",
      exp: now / 1000 + 600,
      ...extra,
    },
  });
  const service = (): AdminService =>
    createMockAdminService({ now: () => now });
  const decide = (
    check: TokenCheck,
    options: { seen?: string; serviceFor?: () => AdminService } = {},
  ) =>
    resolveKitamoSession({
      accessToken: "token",
      seen: options.seen ?? seen,
      now,
      verify: async () => check,
      serviceFor: options.serviceFor ?? service,
    });

  it("sends aal1 to the authenticator step", async () => {
    expect((await decide(claims({ aal: "aal1" }))).kind).toBe("needs_mfa");
    expect(redirectFor("needs_mfa", "/flags")).toBe("/mfa?returnTo=%2Fflags");
  });

  it("is ready at aal2 when Core's km_admin_session answers", async () => {
    const result = await decide(claims({ aal: "aal2" }));
    expect(result.kind).toBe("ready");
    if (result.kind === "ready")
      expect(result.state.label).toBe("Owner (mock)");
  });

  it("treats a refused token (forged, stale, or staff) as expired", async () => {
    expect((await decide({ ok: false, reason: "refused" })).kind).toBe(
      "expired",
    );
    expect((await decide({ ok: false, reason: "unavailable" })).kind).toBe(
      "unavailable",
    );
  });

  it("applies the 30-minute idle before anything else", async () => {
    let verified = false;
    const result = await resolveKitamoSession({
      accessToken: "token",
      seen: String(now - IDLE_MS - 1),
      now,
      verify: async () => {
        verified = true;
        return claims({ aal: "aal2" });
      },
      serviceFor: service,
    });
    expect(result.kind).toBe("idle");
    expect(verified).toBe(false);
    expect(redirectFor("idle", "/overview")).toBe("/sign-in?why=idle");
  });

  it("maps Core's KM005 to the one not-permitted state", async () => {
    const forbidden = () =>
      createMockAdminService({
        failure: { methods: ["getSession"], code: "FORBIDDEN" },
      });
    expect(
      (await decide(claims({ aal: "aal2" }), { serviceFor: forbidden })).kind,
    ).toBe("not_permitted");
    expect(redirectFor("not_permitted", "/overview")).toBe(
      "/access-denied?why=not_permitted",
    );
  });

  it("is signed out with no token, and unavailable when the adapter can't be built", async () => {
    expect(
      (
        await resolveKitamoSession({
          accessToken: undefined,
          seen,
          now,
          verify: async () => claims({ aal: "aal2" }),
          serviceFor: service,
        })
      ).kind,
    ).toBe("signed_out");
    expect(
      (
        await decide(claims({ aal: "aal2" }), {
          serviceFor: () => {
            throw new Error("not configured");
          },
        })
      ).kind,
    ).toBe("unavailable");
  });

  it("keeps return paths same-origin and away from the sign-in steps", () => {
    expect(safeReturnTo("/businesses?q=a")).toBe("/businesses?q=a");
    expect(safeReturnTo("//evil.example")).toBe("/overview");
    expect(safeReturnTo("https://evil.example")).toBe("/overview");
    expect(safeReturnTo("/\\evil.example")).toBe("/overview");
    expect(safeReturnTo("/mfa")).toBe("/overview");
    expect(safeReturnTo("/api/session")).toBe("/overview");
    expect(safeReturnTo(42)).toBe("/overview");
  });
});
