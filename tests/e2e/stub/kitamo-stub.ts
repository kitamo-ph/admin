/**
 * A loopback stand-in for KitaMo's Auth (GoTrue REST) and Core's RPCs
 * (PostgREST) for the admin site's Playwright run. Tests only: nothing here
 * talks to a hosted service. Tokens are ES256 JWTs signed with a key made at
 * start-up and published at /auth/v1/.well-known/jwks.json, so the site's
 * vendored check verifies them exactly as it would KitaMo's.
 *
 * Accounts (any email; the password is STUB_PASSWORD):
 * - `enrolled…@…` starts with a verified TOTP factor; others enrol first;
 * - `owner…@…` is not an admin (Core answers KM005 at aal2);
 * - the TOTP code STUB_TOTP_CODE is the only one accepted.
 *
 * Test controls under /__stub: POST reset, GET calls?email=, POST advance
 * {email, minutes} (moves that account's Core clock), POST switch {on}.
 */
import { createHash, randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { createFakeCore } from "../../support/fake-core";

export const STUB_PASSWORD = "correct-horse-battery";
export const STUB_TOTP_CODE = "123456";
const PORT = Number(process.env.KITAMO_STUB_PORT ?? 3199);
const BASE = `http://127.0.0.1:${PORT}`;
const CAPTCHA = process.env.KITAMO_AUTH_TEST_CAPTCHA_TOKEN ?? "stub-captcha";

type Factor = { id: string; status: "verified" | "unverified" };
type User = { id: string; email: string; factors: Factor[] };
type Issued = { sub: string; aal: string };

const keys = (await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
)) as CryptoKeyPair;
const kid = `stub-${randomUUID().slice(0, 8)}`;
const publicJwk = {
  ...(await crypto.subtle.exportKey("jwk", keys.publicKey)),
  kid,
  alg: "ES256",
  use: "sig",
};

const users = new Map<string, User>();
const refreshTokens = new Map<string, Issued>();
const challenges = new Map<string, string>();
const restCalls: { sub: string | null; method: string; path: string }[] = [];
const core = createFakeCore();

function userFor(email: string): User {
  const key = email.toLowerCase();
  let user = users.get(key);
  if (user === undefined) {
    const hex = createHash("sha256").update(key).digest("hex");
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
    user = {
      id,
      email: key,
      factors: key.startsWith("enrolled")
        ? [{ id: randomUUID(), status: "verified" }]
        : [],
    };
    users.set(key, user);
  }
  return user;
}

function userById(id: string): User | undefined {
  return [...users.values()].find((user) => user.id === id);
}

const b64url = (data: Uint8Array | string) =>
  Buffer.from(typeof data === "string" ? data : data).toString("base64url");

async function sign(user: User, aal: "aal1" | "aal2") {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "ES256", typ: "JWT", kid }));
  const body = b64url(
    JSON.stringify({
      iss: `${BASE}/auth/v1`,
      aud: "authenticated",
      sub: user.id,
      email: user.email,
      role: "authenticated",
      aal,
      amr:
        aal === "aal2"
          ? [{ method: "totp" }, { method: "password" }]
          : [{ method: "password" }],
      session_id: randomUUID(),
      is_anonymous: false,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      keys.privateKey,
      new TextEncoder().encode(`${head}.${body}`),
    ),
  );
  const access = `${head}.${body}.${b64url(signature)}`;
  const refresh = randomUUID();
  refreshTokens.set(refresh, { sub: user.id, aal });
  return {
    access_token: access,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: refresh,
    user: { id: user.id, email: user.email },
  };
}

async function verify(
  token: string,
): Promise<{ sub: string; aal: string } | null> {
  const [head, body, signature] = token.split(".");
  if (!head || !body || !signature) return null;
  const valid = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    keys.publicKey,
    Buffer.from(signature, "base64url"),
    new TextEncoder().encode(`${head}.${body}`),
  );
  if (!valid) return null;
  const claims = JSON.parse(Buffer.from(body, "base64url").toString()) as {
    sub: string;
    aal: string;
    exp: number;
  };
  if (claims.exp * 1000 < Date.now()) return null;
  return { sub: claims.sub, aal: claims.aal };
}

function send(response: ServerResponse, status: number, body?: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(body === undefined ? "" : JSON.stringify(body));
}

async function readJson(
  request: IncomingMessage,
): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");
  if (text === "") return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function bearer(request: IncomingMessage) {
  const header = request.headers.authorization ?? "";
  const token = /^Bearer (.+)$/.exec(header)?.[1];
  return token === undefined ? null : verify(token);
}

const QR =
  'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="black"/></svg>';

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", BASE);
  const path = url.pathname;
  const method = request.method ?? "GET";
  try {
    // -- test controls ----------------------------------------------------
    if (path === "/__stub/health") return send(response, 200, { ok: true });
    if (path === "/__stub/reset" && method === "POST") {
      users.clear();
      refreshTokens.clear();
      challenges.clear();
      restCalls.length = 0;
      core.reset();
      return send(response, 200, { ok: true });
    }
    if (path === "/__stub/calls" && method === "GET") {
      const email = url.searchParams.get("email") ?? "";
      const sub = userFor(email).id;
      return send(response, 200, {
        rpc: core.calls
          .filter((call) => call.sub === sub)
          .map((call) => call.fn),
        rest: restCalls.filter((call) => call.sub === sub),
      });
    }
    if (path === "/__stub/advance" && method === "POST") {
      const body = await readJson(request);
      core.advance(
        userFor(String(body.email)).id,
        Number(body.minutes) * 60_000,
      );
      return send(response, 200, { ok: true });
    }
    if (path === "/__stub/switch" && method === "POST") {
      core.setSwitch(Boolean((await readJson(request)).on));
      return send(response, 200, { ok: true });
    }

    // -- GoTrue -----------------------------------------------------------
    if (path === "/auth/v1/.well-known/jwks.json") {
      return send(response, 200, { keys: [publicJwk] });
    }
    if (path === "/auth/v1/token" && method === "POST") {
      const body = await readJson(request);
      if (url.searchParams.get("grant_type") === "password") {
        const captcha = (
          body.gotrue_meta_security as { captcha_token?: string } | undefined
        )?.captcha_token;
        if (captcha !== CAPTCHA) {
          return send(response, 400, {
            error_code: "captcha_failed",
            msg: "captcha",
          });
        }
        if (body.password !== STUB_PASSWORD || typeof body.email !== "string") {
          return send(response, 400, {
            error_code: "invalid_credentials",
            msg: "Invalid login credentials",
          });
        }
        return send(response, 200, await sign(userFor(body.email), "aal1"));
      }
      if (url.searchParams.get("grant_type") === "refresh_token") {
        const issued = refreshTokens.get(String(body.refresh_token));
        const user = issued === undefined ? undefined : userById(issued.sub);
        if (issued === undefined || user === undefined) {
          return send(response, 400, { error_code: "refresh_token_not_found" });
        }
        refreshTokens.delete(String(body.refresh_token));
        return send(
          response,
          200,
          await sign(user, issued.aal === "aal2" ? "aal2" : "aal1"),
        );
      }
    }
    if (path === "/auth/v1/logout" && method === "POST") {
      return send(response, 204);
    }
    if (
      path.startsWith("/auth/v1/user") ||
      path.startsWith("/auth/v1/factors")
    ) {
      const claims = await bearer(request);
      const user = claims === null ? undefined : userById(claims.sub);
      if (claims === null || user === undefined) {
        return send(response, 401, {
          error_code: "bad_jwt",
          msg: "invalid JWT",
        });
      }
      if (path === "/auth/v1/user" && method === "GET") {
        return send(response, 200, {
          id: user.id,
          email: user.email,
          factors: user.factors.map((factor) => ({
            id: factor.id,
            friendly_name: "KitaMo Admin",
            factor_type: "totp",
            status: factor.status,
          })),
        });
      }
      if (path === "/auth/v1/factors" && method === "POST") {
        const factor: Factor = { id: randomUUID(), status: "unverified" };
        user.factors.push(factor);
        return send(response, 200, {
          id: factor.id,
          type: "totp",
          friendly_name: "KitaMo Admin",
          totp: {
            qr_code: QR,
            secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
            uri: "otpauth://totp/stub",
          },
        });
      }
      const factorMatch =
        /^\/auth\/v1\/factors\/([0-9a-f-]{36})(\/challenge|\/verify)?$/.exec(
          path,
        );
      const factor = user.factors.find(
        (candidate) => candidate.id === factorMatch?.[1],
      );
      if (factorMatch === null || factor === undefined) {
        return send(response, 404, { error_code: "mfa_factor_not_found" });
      }
      if (factorMatch[2] === undefined && method === "DELETE") {
        user.factors = user.factors.filter(
          (candidate) => candidate.id !== factor.id,
        );
        return send(response, 200, { id: factor.id });
      }
      if (factorMatch[2] === "/challenge" && method === "POST") {
        const id = randomUUID();
        challenges.set(id, factor.id);
        return send(response, 200, {
          id,
          type: "totp",
          expires_at: Math.floor(Date.now() / 1000) + 300,
        });
      }
      if (factorMatch[2] === "/verify" && method === "POST") {
        const body = await readJson(request);
        if (challenges.get(String(body.challenge_id)) !== factor.id) {
          return send(response, 422, { error_code: "mfa_challenge_expired" });
        }
        challenges.delete(String(body.challenge_id));
        if (body.code !== STUB_TOTP_CODE) {
          return send(response, 422, {
            error_code: "mfa_verification_failed",
            msg: "Invalid TOTP code entered",
          });
        }
        factor.status = "verified";
        return send(response, 200, await sign(user, "aal2"));
      }
    }

    // -- PostgREST ----------------------------------------------------------
    if (path.startsWith("/rest/v1/")) {
      const claims = await bearer(request);
      restCalls.push({ sub: claims?.sub ?? null, method, path });
      const rpc = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(path);
      if (claims === null)
        return send(response, 401, {
          code: "PGRST301",
          message: "JWT invalid",
        });
      if (rpc?.[1] === undefined || method !== "POST") {
        return send(response, 405, {
          code: "PGRST000",
          message: "Only POSTed RPCs exist here",
        });
      }
      const user = userById(claims.sub);
      const reply = core.rpc(rpc[1], await readJson(request), {
        sub: claims.sub,
        aal: claims.aal,
        admin: user !== undefined && !user.email.startsWith("owner"),
      });
      return send(response, reply.status, reply.body);
    }
    return send(response, 404, { message: "Not in the stub" });
  } catch (error) {
    return send(response, 500, {
      message: error instanceof Error ? error.message : "stub error",
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`kitamo stub on ${BASE}`);
});
