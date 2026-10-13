/** ES256 test keys and tokens for the vendored KitaMo check (tests only). */
export const TEST_BASE = "https://kitamo-test.supabase.co";

export type TestKey = {
  kid: string;
  privateKey: CryptoKey;
  jwk: JsonWebKey & { kid: string };
};

export async function makeKey(kid: string): Promise<TestKey> {
  const pair = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return {
    kid,
    privateKey: pair.privateKey,
    jwk: { ...jwk, kid, alg: "ES256", use: "sig" },
  };
}

function b64url(data: Uint8Array | string): string {
  return Buffer.from(
    typeof data === "string" ? new TextEncoder().encode(data) : data,
  ).toString("base64url");
}

export async function signToken(
  key: TestKey,
  extra: Record<string, unknown> = {},
  base = TEST_BASE,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(
    JSON.stringify({ alg: "ES256", typ: "JWT", kid: key.kid }),
  );
  const body = b64url(
    JSON.stringify({
      iss: `${base}/auth/v1`,
      aud: "authenticated",
      sub: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      role: "authenticated",
      aal: "aal2",
      exp: now + 600,
      iat: now,
      ...extra,
    }),
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key.privateKey,
    new TextEncoder().encode(`${head}.${body}`),
  );
  return `${head}.${body}.${b64url(new Uint8Array(signature))}`;
}

export function jwksFetch(key: TestKey): typeof fetch {
  return async () =>
    new Response(JSON.stringify({ keys: [key.jwk] }), { status: 200 });
}
