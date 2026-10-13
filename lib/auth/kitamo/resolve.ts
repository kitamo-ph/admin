import type { AdminService } from "@/lib/admin/service";
import type { AdminSessionState } from "@/lib/admin/r16-schemas";

import type { KitamoClaims } from "../vendor/kitamo-login";
import { isAal2, type TokenCheck } from "./login";
import { idleExpired } from "./session";

/**
 * The admin site's per-request session decision (spec §5.1 step 4), pure so
 * it is unit-tested without Next: the idle rule, the ES256 check, aal2, then
 * Core's km_admin_session. Core's answer is the authority: the site's own
 * checks only decide where to send the browser.
 */
export type KitamoResolution =
  | {
      kind: "ready";
      claims: KitamoClaims;
      state: AdminSessionState;
      service: AdminService;
    }
  /** No KitaMo session cookie. */
  | { kind: "signed_out" }
  /** 30 minutes without activity. */
  | { kind: "idle" }
  /** A forged, stale or staff token, or Core refused the token. */
  | { kind: "expired" }
  /** Signed in with a password only (aal1): finish the authenticator step. */
  | { kind: "needs_mfa" }
  /** Core's KM005: not the admin, an owner, a manager, or the switch is off. */
  | { kind: "not_permitted" }
  | { kind: "unavailable" };

export async function resolveKitamoSession(input: {
  accessToken: string | undefined;
  seen: string | undefined;
  now: number;
  verify: (token: string) => Promise<TokenCheck>;
  serviceFor: (token: string) => AdminService;
}): Promise<KitamoResolution> {
  if (input.accessToken === undefined || input.accessToken === "") {
    return { kind: "signed_out" };
  }
  if (idleExpired(input.seen, input.now)) return { kind: "idle" };
  const check = await input.verify(input.accessToken);
  if (!check.ok) {
    return check.reason === "refused"
      ? { kind: "expired" }
      : { kind: "unavailable" };
  }
  if (!isAal2(check.claims)) return { kind: "needs_mfa" };
  let service: AdminService;
  try {
    service = input.serviceFor(input.accessToken);
  } catch {
    return { kind: "unavailable" };
  }
  const session = await service.getSession();
  if (session.ok) {
    return {
      kind: "ready",
      claims: check.claims,
      state: session.data,
      service,
    };
  }
  switch (session.error.code) {
    case "FORBIDDEN":
      return { kind: "not_permitted" };
    case "UNAUTHORIZED":
      return { kind: "expired" };
    default:
      return { kind: "unavailable" };
  }
}

/** Where a request that is not `ready` goes. */
export function redirectFor(
  kind: Exclude<KitamoResolution["kind"], "ready">,
  returnTo: string,
): string {
  switch (kind) {
    case "signed_out":
      return `/sign-in?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
    case "idle":
      return "/sign-in?why=idle";
    case "expired":
      return "/sign-in?why=expired";
    case "needs_mfa":
      return `/mfa?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
    case "not_permitted":
      return "/access-denied?why=not_permitted";
    case "unavailable":
      return "/unavailable";
  }
}

/** A same-origin relative path, or /overview. */
export function safeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/overview";
  }
  try {
    const url = new URL(value, "https://admin.kitamo.online");
    if (url.origin !== "https://admin.kitamo.online") return "/overview";
    if (
      url.pathname.startsWith("/sign-in") ||
      url.pathname.startsWith("/mfa") ||
      url.pathname.startsWith("/api/")
    ) {
      return "/overview";
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/overview";
  }
}
