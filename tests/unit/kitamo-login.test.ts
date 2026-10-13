import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import {
  isAal2,
  resetLoginForTests,
  verifyKitamoToken,
} from "@/lib/auth/kitamo/login";
import { KITAMO_LOGIN_VERSION } from "@/lib/auth/vendor/kitamo-login";

import { TEST_BASE, jwksFetch, makeKey, signToken } from "../support/jwt";

/**
 * seller-web modules/kitamo-login/index.ts at 7e06ff4 (1.0.0), the canonical
 * copy (ED-008), as Operations pins it (service/tests/kitamo-login.test.ts
 * at dbe4ca6). Never edit the vendored file; re-vendor and re-pin instead.
 */
const PINNED_SHA256 =
  "12cd4bf0bb5e575ad2873b5bec48eef8f16a8e77024fac9f1eb76e7bdf79af72";
const env = { KITAMO_SUPABASE_URL: TEST_BASE } as unknown as NodeJS.ProcessEnv;

afterEach(() => {
  resetLoginForTests();
});

describe("the vendored kitamo-login", () => {
  it("is the canonical copy, byte for byte below its two-line header", () => {
    const file = readFileSync(
      new URL("../../lib/auth/vendor/kitamo-login.ts", import.meta.url),
      "utf8",
    );
    const body = file.split("\n").slice(2).join("\n");
    expect(createHash("sha256").update(body).digest("hex")).toBe(PINNED_SHA256);
    expect(KITAMO_LOGIN_VERSION).toBe("1.0.0");
  });

  it("admits a valid ES256 token and returns its claims", async () => {
    const key = await makeKey("k1");
    const result = await verifyKitamoToken(
      await signToken(key),
      env,
      jwksFetch(key),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.claims.sub).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
      expect(isAal2(result.claims)).toBe(true);
    }
  });

  it("refuses a forged, expired, malformed or wrong-issuer token", async () => {
    const key = await makeKey("k1");
    const other = await makeKey("k1");
    const fetchImpl = jwksFetch(key);
    for (const token of [
      await signToken(other),
      await signToken(key, { exp: 1 }),
      "not.a.token",
      await signToken(key, {}, "https://someone-else.supabase.co"),
    ]) {
      expect(await verifyKitamoToken(token, env, fetchImpl)).toEqual({
        ok: false,
        reason: "refused",
      });
    }
  });

  it("refuses staff: anonymous users never sign in to the admin site", async () => {
    const key = await makeKey("k1");
    expect(
      await verifyKitamoToken(
        await signToken(key, { is_anonymous: true }),
        env,
        jwksFetch(key),
      ),
    ).toEqual({ ok: false, reason: "refused" });
  });

  it("answers unavailable when KitaMo's keys can't be read or the URL is unset", async () => {
    const key = await makeKey("k2");
    const down: typeof fetch = async () => new Response("", { status: 503 });
    expect(await verifyKitamoToken(await signToken(key), env, down)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(
      await verifyKitamoToken(await signToken(key), {} as NodeJS.ProcessEnv),
    ).toEqual({ ok: false, reason: "unavailable" });
  });

  it("tells aal1 from aal2", async () => {
    const key = await makeKey("k3");
    const result = await verifyKitamoToken(
      await signToken(key, { aal: "aal1" }),
      env,
      jwksFetch(key),
    );
    expect(result.ok && isAal2(result.claims)).toBe(false);
  });
});
