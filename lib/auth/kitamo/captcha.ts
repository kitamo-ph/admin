/**
 * Turnstile, as Operations' console configures it (service/lib/console/captcha.ts
 * at dbe4ca6, itself Accounting's): a real site key in production,
 * Cloudflare's testing keys refused there, and a local-test mode only for a
 * loopback Auth on a loopback admin site.
 */
export type CaptchaConfiguration =
  | { mode: "widget"; siteKey: string }
  | { mode: "local-test" }
  | { mode: "unavailable" };

const TESTING_SITE_KEYS = new Set([
  "1x00000000000000000000AA",
  "2x00000000000000000000AB",
  "1x00000000000000000000BB",
  "2x00000000000000000000BB",
  "3x00000000000000000000FF",
]);
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

function loopbackHttp(value: string | undefined): boolean {
  if (value === undefined || value === "") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" && LOOPBACK.has(url.hostname);
  } catch {
    return false;
  }
}

export function localTestAuth(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    ["development", "test"].includes(env.NODE_ENV ?? "") &&
    env.VERCEL_ENV !== "production" &&
    loopbackHttp(env.KITAMO_SUPABASE_URL) &&
    typeof env.KITAMO_AUTH_TEST_CAPTCHA_TOKEN === "string" &&
    env.KITAMO_AUTH_TEST_CAPTCHA_TOKEN.length > 0
  );
}

export function captchaConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): CaptchaConfiguration {
  if (localTestAuth(env)) return { mode: "local-test" };
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (siteKey === undefined || !/^[A-Za-z0-9_-]{10,256}$/.test(siteKey))
    return { mode: "unavailable" };
  if (
    (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") &&
    TESTING_SITE_KEYS.has(siteKey)
  ) {
    return { mode: "unavailable" };
  }
  return { mode: "widget", siteKey };
}
