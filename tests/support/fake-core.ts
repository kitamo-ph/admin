import { MockR16Store, R16Refusal } from "../../lib/admin/mock-r16";
import { FLAG_TRANSITIONS } from "../../lib/admin/r16-rules";

/**
 * A local stand-in for Core's R16 RPCs over PostgREST (tests only; never a
 * hosted call). Replies are Core-shaped: snake_case keys exactly as the spec
 * §3.2 allowlists them, jsonb-style timestamps ("+00:00", microseconds), and
 * PostgREST's error body with KM005 / KM003 (detail.reason) / KM015 /
 * PGRST202. The rules come from the same R16 engine as the mock adapter, so
 * the two adapters answer the shared contract tests alike (ADM-021).
 */

export type FakeCaller = {
  sub: string;
  aal: string;
  /** False for an owner (or any account without a live platform_admins row). */
  admin: boolean;
};

export type FakeReply = { status: number; body: unknown };

export type FakeCall = { sub: string; fn: string; at: number };

const ISO_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/** camelCase keys → snake_case (`active7d` → `active_7d`); timestamps as jsonb prints them. */
export function toCoreJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toCoreJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        snake(key),
        toCoreJson(entry),
      ]),
    );
  }
  if (typeof value === "string" && ISO_Z.test(value)) {
    const [whole, fraction = ".000"] = value.slice(0, -1).split(/(?=\.)/);
    return `${whole}${fraction.padEnd(7, "0")}+00:00`;
  }
  return value;
}

function snake(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([a-z])(\d)/g, "$1_$2")
    .toLowerCase();
}

function refusal(error: unknown): FakeReply {
  if (error instanceof R16Refusal) {
    if (error.kind === "forbidden") return km005();
    if (error.kind === "conflict") {
      return {
        status: 400,
        body: {
          code: "KM015",
          message: "Request details changed.",
          details: null,
          hint: null,
        },
      };
    }
    return {
      status: 400,
      body: {
        code: "KM003",
        message: "Invalid request.",
        details: JSON.stringify({ reason: error.reason ?? "input" }),
        hint: null,
      },
    };
  }
  return {
    status: 500,
    body: {
      code: "XX000",
      message: "Request failed.",
      details: null,
      hint: null,
    },
  };
}

export function km005(): FakeReply {
  return {
    status: 400,
    body: {
      code: "KM005",
      message: "Not permitted.",
      details: null,
      hint: null,
    },
  };
}

function pgrst202(fn: string): FakeReply {
  return {
    status: 404,
    body: {
      code: "PGRST202",
      message: `Could not find the function public.${fn} in the schema cache`,
      details: null,
      hint: null,
    },
  };
}

type Params = Record<string, unknown>;
const str = (params: Params, key: string): string | null =>
  typeof params[key] === "string" ? (params[key] as string) : null;
const num = (params: Params, key: string): number | null =>
  typeof params[key] === "number" ? (params[key] as number) : null;

export function createFakeCore(
  options: { now?: () => number; switchOn?: boolean } = {},
) {
  const stores = new Map<string, MockR16Store>();
  const offsets = new Map<string, number>();
  const calls: FakeCall[] = [];
  let switchOn = options.switchOn ?? true;
  const baseNow = options.now ?? Date.now;

  function storeFor(sub: string): MockR16Store {
    let store = stores.get(sub);
    if (store === undefined) {
      store = new MockR16Store(() => baseNow() + (offsets.get(sub) ?? 0));
      stores.set(sub, store);
    }
    return store;
  }

  function ok(value: unknown): FakeReply {
    return { status: 200, body: toCoreJson(value) };
  }

  function rpc(fn: string, params: Params, caller: FakeCaller): FakeReply {
    calls.push({ sub: caller.sub, fn, at: baseNow() });
    const known = [
      "km_admin_session",
      "km_admin_directory",
      "open_admin_access",
      "close_admin_access",
      "km_admin_business_summary",
      "km_admin_business_records",
      "km_admin_flags",
      "km_admin_access_log",
      "raise_admin_flag",
      "review_admin_flag",
    ];
    if (!known.includes(fn)) return pgrst202(fn);
    // km_admin_can: the switch, aal2, a live platform admin (and no business).
    if (!switchOn || caller.aal !== "aal2" || !caller.admin) return km005();
    const store = storeFor(caller.sub);
    try {
      switch (fn) {
        case "km_admin_session":
          return ok(store.session());
        case "km_admin_directory":
          return ok(
            store.directory({
              search: str(params, "p_search") ?? undefined,
              after: str(params, "p_after") ?? undefined,
              limit: num(params, "p_limit") ?? 50,
            }),
          );
        case "open_admin_access":
          return ok(
            store.open({
              businessId: str(params, "p_business_id") ?? "",
              level: (str(params, "p_level") ?? "summary") as
                "summary" | "records",
              reasonCode: (str(params, "p_reason_code") ??
                "support_request") as "support_request",
              reasonText: str(params, "p_reason_text") ?? "",
              flagId: str(params, "p_flag_id"),
              reference: str(params, "p_reference"),
              withholdCode: str(params, "p_withhold_code") as
                "legal_request" | null,
              withholdDays: num(params, "p_withhold_days"),
              clientRequestId: str(params, "p_client_request_id") ?? "",
            }),
          );
        case "close_admin_access":
          return ok(
            store.close({
              accessId: str(params, "p_access_id") ?? "",
              clientRequestId: str(params, "p_client_request_id") ?? "",
            }),
          );
        case "km_admin_business_summary":
          return ok(store.summary(str(params, "p_business_id") ?? ""));
        case "km_admin_business_records": {
          const kind = str(params, "p_kind");
          if (
            kind !== "sales" &&
            kind !== "credit" &&
            kind !== "staff" &&
            kind !== "audit"
          ) {
            throw new R16Refusal("invalid", "kind");
          }
          return ok(
            store.records({
              businessId: str(params, "p_business_id") ?? "",
              kind,
              from: str(params, "p_from"),
              to: str(params, "p_to"),
            }),
          );
        }
        case "km_admin_flags":
          return ok(
            store.flagList({
              status: str(params, "p_status") as "open" | null,
            }),
          );
        case "km_admin_access_log": {
          const before = str(params, "p_before");
          return ok(
            store.accessLog(
              before === null ? null : new Date(before).toISOString(),
            ),
          );
        }
        case "raise_admin_flag": {
          const source = str(params, "p_source");
          if (source !== "health" && source !== "admin") {
            throw new R16Refusal("invalid", "source");
          }
          return ok(
            store.raise({
              businessId: str(params, "p_business_id") ?? "",
              kind: (str(params, "p_kind") ?? "other") as "other",
              source,
              evidence: (params.p_evidence ?? {}) as Record<string, never>,
              clientRequestId: str(params, "p_client_request_id") ?? "",
            }),
          );
        }
        case "review_admin_flag":
          return ok(
            store.review(
              {
                flagId: str(params, "p_flag_id") ?? "",
                status: (str(params, "p_status") ?? "open") as "open",
                note: str(params, "p_note"),
                clientRequestId: str(params, "p_client_request_id") ?? "",
              },
              FLAG_TRANSITIONS,
            ),
          );
      }
    } catch (error) {
      return refusal(error);
    }
    return pgrst202(fn);
  }

  return {
    rpc,
    calls,
    /** Moves one caller's clock (e.g. past an access's 30 minutes). */
    advance(sub: string, ms: number) {
      offsets.set(sub, (offsets.get(sub) ?? 0) + ms);
    },
    setSwitch(on: boolean) {
      switchOn = on;
    },
    reset() {
      stores.clear();
      offsets.clear();
      calls.length = 0;
      switchOn = options.switchOn ?? true;
    },
  };
}

export type FakeCore = ReturnType<typeof createFakeCore>;

/** A fetch that answers `POST {base}/rest/v1/rpc/<fn>` from a fake Core (vitest). */
export function fakeCoreFetch(
  core: FakeCore,
  callerFor: (token: string) => FakeCaller | null,
): typeof fetch {
  return async (input, init) => {
    const url = new URL(String(input));
    const match = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(url.pathname);
    if (init?.method !== "POST" || match?.[1] === undefined) {
      return new Response(
        JSON.stringify({ code: "PGRST000", message: "Not a POSTed RPC" }),
        {
          status: 405,
        },
      );
    }
    const headers = new Headers(init.headers);
    const token =
      /^Bearer (.+)$/.exec(headers.get("authorization") ?? "")?.[1] ?? "";
    const caller = callerFor(token);
    if (caller === null || headers.get("apikey") === null) {
      return new Response(
        JSON.stringify({ code: "PGRST301", message: "JWT invalid" }),
        {
          status: 401,
        },
      );
    }
    const params = JSON.parse(String(init.body ?? "{}")) as Params;
    const reply = core.rpc(match[1], params, caller);
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { "content-type": "application/json" },
    });
  };
}
