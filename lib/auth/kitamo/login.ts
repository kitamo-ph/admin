import {
  createKitamoLogin,
  KitamoLoginError,
  type KitamoClaims,
} from "../vendor/kitamo-login";

type Verifier = ReturnType<typeof createKitamoLogin>;

let current: {
  base: string;
  fetchImpl: typeof fetch;
  verifier: Verifier;
} | null = null;

export function resetLoginForTests(): void {
  current = null;
}

export type TokenCheck =
  | { ok: true; claims: KitamoClaims }
  /** A forged, stale, anonymous (staff) or malformed token: sign in again. */
  | { ok: false; reason: "refused" }
  /** KitaMo's keys could not be read, or the site is not configured. */
  | { ok: false; reason: "unavailable" };

/**
 * The vendored ES256 check (D19 §5, copied from Operations at dbe4ca6): a
 * forged or stale token never reaches Core. Staff tokens are anonymous users
 * and are always refused here (allowAnonymous: false). The verifier keeps
 * KitaMo's keys between requests.
 */
export async function verifyKitamoToken(
  token: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<TokenCheck> {
  const base = env.KITAMO_SUPABASE_URL;
  if (base === undefined || base === "") {
    return { ok: false, reason: "unavailable" };
  }
  if (
    current === null ||
    current.base !== base ||
    current.fetchImpl !== fetchImpl
  ) {
    current = {
      base,
      fetchImpl,
      verifier: createKitamoLogin({ supabaseUrl: base, fetch: fetchImpl }),
    };
  }
  try {
    const claims = await current.verifier.verify(token, {
      allowAnonymous: false,
    });
    return { ok: true, claims };
  } catch (error) {
    if (error instanceof KitamoLoginError && error.reason !== "jwks") {
      return { ok: false, reason: "refused" };
    }
    return { ok: false, reason: "unavailable" };
  }
}

/** Supabase puts `aal` in the access token; an MFA session is aal2. */
export function isAal2(claims: KitamoClaims): boolean {
  return claims.aal === "aal2";
}
