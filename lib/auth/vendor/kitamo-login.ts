// @ts-nocheck -- vendored verbatim (ED-008) from seller-web modules/kitamo-login/index.ts at 7e06ff4,
// where it is type-checked. Never edit below these two lines: tests/unit/kitamo-login.test.ts pins the sha256.
/**
 * Verify a KitaMo sign-in token in a module service (D19 §5, F0; ED-019).
 *
 * Every module service (Insights, Operations, Marketing, and Accounting's read
 * API) gets the caller's KitaMo Supabase access token as a bearer. This checks
 * it locally: an ES256 JWS whose key is found by `kid` in KitaMo's JWKS, with
 * the issuer, audience, expiry and not-before checked. It never asks KitaMo's
 * Auth, holds no secret and mints nothing. Who the caller is for a business
 * (owner or staff, stalls, powers, consent) is km_module_context's answer,
 * asked next with the same token: this only says the token is KitaMo's and
 * still valid.
 *
 * Zero dependencies (WebCrypto only), so each service vendors this one file
 * at a pinned commit with a VERSION and a sha256 drift test (ED-008). The
 * canonical copy lives here, in seller-web; never edit a vendored copy.
 */

export const KITAMO_LOGIN_VERSION = "1.0.0";

export type KitamoLoginReason =
  | "malformed"
  | "alg"
  | "kid"
  | "signature"
  | "issuer"
  | "audience"
  | "expired"
  | "not_yet_valid"
  | "subject"
  | "anonymous"
  | "jwks";

/** Every refusal. A service answers 401 for all of them, with no detail. */
export class KitamoLoginError extends Error {
  readonly reason: KitamoLoginReason;
  constructor(reason: KitamoLoginReason) {
    super(`KitaMo sign-in refused: ${reason}`);
    this.name = "KitamoLoginError";
    this.reason = reason;
  }
}

export type KitamoClaims = {
  /** The Auth user's id. */
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat?: number;
  nbf?: number;
  role?: string;
  /** A staff sign-in (D2): an anonymous user, never an owner. */
  is_anonymous?: boolean;
  session_id?: string;
  [claim: string]: unknown;
};

export type KitamoLoginConfig = {
  /** KitaMo's Supabase project URL, e.g. https://<ref>.supabase.co. */
  supabaseUrl: string;
  /** Supabase's access-token audience. */
  audience?: string;
  /** Allowed clock difference, in seconds, for exp and nbf. */
  clockSkewSeconds?: number;
  /** How long fetched keys are trusted before the JWKS is read again. */
  jwksTtlMs?: number;
  /** The shortest gap between two reads forced by an unknown kid. */
  unknownKidCooldownMs?: number;
  fetch?: typeof fetch;
  /** Milliseconds since the epoch; tests pass a fixed clock. */
  now?: () => number;
};

export type VerifyOptions = {
  /** Staff tokens are anonymous users. Only staff-safe endpoints pass true. */
  allowAnonymous?: boolean;
};

type Jwk = { kty?: unknown; crv?: unknown; x?: unknown; y?: unknown; kid?: unknown; alg?: unknown; use?: unknown };

const SEGMENT = /^[A-Za-z0-9_-]+$/;

function bytesFromBase64Url(segment: string): Uint8Array<ArrayBuffer> {
  if (!SEGMENT.test(segment)) throw new KitamoLoginError("malformed");
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((segment.length + 3) % 4);
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new KitamoLoginError("malformed");
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function jsonSegment(segment: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(segment)));
  } catch (error) {
    if (error instanceof KitamoLoginError) throw error;
    throw new KitamoLoginError("malformed");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new KitamoLoginError("malformed");
  return value as Record<string, unknown>;
}

function isP256VerifyKey(jwk: Jwk): boolean {
  return (
    jwk.kty === "EC" &&
    jwk.crv === "P-256" &&
    typeof jwk.x === "string" &&
    typeof jwk.y === "string" &&
    typeof jwk.kid === "string" &&
    (jwk.alg === undefined || jwk.alg === "ES256") &&
    (jwk.use === undefined || jwk.use === "sig")
  );
}

/**
 * One verifier per service process: it keeps the keys between requests.
 * `verify` resolves to the token's claims or rejects with KitamoLoginError.
 */
export function createKitamoLogin(config: KitamoLoginConfig) {
  const base = config.supabaseUrl.replace(/\/+$/, "");
  const issuer = `${base}/auth/v1`;
  const jwksUrl = `${issuer}/.well-known/jwks.json`;
  const audience = config.audience ?? "authenticated";
  const skew = config.clockSkewSeconds ?? 30;
  const ttl = config.jwksTtlMs ?? 10 * 60_000;
  const cooldown = config.unknownKidCooldownMs ?? 30_000;
  const fetchImpl = config.fetch ?? fetch;
  const now = config.now ?? Date.now;

  let keys = new Map<string, CryptoKey>();
  let fetchedAt = Number.NEGATIVE_INFINITY;
  let inFlight: Promise<void> | null = null;

  async function load(): Promise<void> {
    let body: unknown;
    try {
      const response = await fetchImpl(jwksUrl, { signal: AbortSignal.timeout(3_000) });
      if (!response.ok) throw new KitamoLoginError("jwks");
      body = await response.json();
    } catch {
      throw new KitamoLoginError("jwks");
    }
    const list = (body as { keys?: unknown })?.keys;
    if (!Array.isArray(list)) throw new KitamoLoginError("jwks");
    const next = new Map<string, CryptoKey>();
    for (const jwk of list as Jwk[]) {
      if (!isP256VerifyKey(jwk)) continue;
      try {
        const key = await crypto.subtle.importKey(
          "jwk",
          { kty: "EC", crv: "P-256", x: jwk.x as string, y: jwk.y as string, ext: true },
          { name: "ECDSA", namedCurve: "P-256" },
          false,
          ["verify"],
        );
        next.set(jwk.kid as string, key);
      } catch {
        // A key that does not import is skipped, never trusted.
      }
    }
    keys = next;
    fetchedAt = now();
  }

  function refresh(): Promise<void> {
    inFlight ??= load().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  async function keyFor(kid: string): Promise<CryptoKey> {
    if (now() - fetchedAt >= ttl) await refresh();
    const known = keys.get(kid);
    if (known) return known;
    // A key rotation: read once more, but not on every request with a bad kid.
    if (now() - fetchedAt >= cooldown) {
      await refresh();
      const fresh = keys.get(kid);
      if (fresh) return fresh;
    }
    throw new KitamoLoginError("kid");
  }

  async function verify(token: string, options: VerifyOptions = {}): Promise<KitamoClaims> {
    if (typeof token !== "string" || token.length > 16_384) throw new KitamoLoginError("malformed");
    const parts = token.split(".");
    if (parts.length !== 3) throw new KitamoLoginError("malformed");
    const [headerPart, payloadPart, signaturePart] = parts;
    const header = jsonSegment(headerPart);
    if (header.alg !== "ES256") throw new KitamoLoginError("alg");
    if (typeof header.kid !== "string" || header.kid === "") throw new KitamoLoginError("kid");
    const claims = jsonSegment(payloadPart);
    const signature = bytesFromBase64Url(signaturePart);
    // A JWS ES256 signature is r‖s, 64 bytes: what WebCrypto's ECDSA expects.
    if (signature.length !== 64) throw new KitamoLoginError("signature");

    const key = await keyFor(header.kid);
    const signed = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
    const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, signature, signed);
    if (!valid) throw new KitamoLoginError("signature");

    if (claims.iss !== issuer) throw new KitamoLoginError("issuer");
    const aud = claims.aud;
    if (!(aud === audience || (Array.isArray(aud) && aud.includes(audience)))) throw new KitamoLoginError("audience");
    const seconds = Math.floor(now() / 1000);
    if (typeof claims.exp !== "number" || seconds >= claims.exp + skew) throw new KitamoLoginError("expired");
    if (claims.nbf !== undefined && (typeof claims.nbf !== "number" || seconds < claims.nbf - skew)) {
      throw new KitamoLoginError("not_yet_valid");
    }
    if (typeof claims.sub !== "string" || claims.sub === "") throw new KitamoLoginError("subject");
    if (claims.is_anonymous === true && !options.allowAnonymous) throw new KitamoLoginError("anonymous");
    return claims as KitamoClaims;
  }

  return { verify, issuer, jwksUrl };
}

/** The bearer token of an Authorization header, or null. */
export function bearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(header.trim());
  return match ? match[1] : null;
}
