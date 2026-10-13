import { z } from "zod";

import {
  km003Reason,
  parseAccessLogReply,
  parseAssociationsReply,
  parseCloseReply,
  parseDirectoryReply,
  parseFlagsReply,
  parseOpenReply,
  parseRaiseReply,
  parseRecordsReply,
  parseReviewReply,
  parseSessionReply,
  parseSummaryReply,
  postgrestErrorSchema,
} from "./core-schemas";
import {
  accessLogQuerySchema,
  accessLogSchema,
  adminSessionStateSchema,
  associationListSchema,
  businessSummarySchema,
  closeAccessInputSchema,
  closedAccessSchema,
  coreIdSchema,
  directoryPageSchema,
  directoryQuerySchema,
  flagListSchema,
  flagsQuerySchema,
  openAccessInputSchema,
  openedAccessSchema,
  overviewSchema,
  raiseFlagInputSchema,
  raisedFlagSchema,
  recordsPageSchema,
  recordsQuerySchema,
  reviewFlagInputSchema,
  reviewedFlagSchema,
  type AccessLog,
  type AccessLogQuery,
  type AdminSessionState,
  type Association,
  type BusinessSummary,
  type CloseAccessInput,
  type ClosedAccess,
  type DirectoryPage,
  type DirectoryQuery,
  type Flag,
  type FlagsQuery,
  type OpenAccessInput,
  type OpenedAccess,
  type Overview,
  type RaiseFlagInput,
  type RaisedFlag,
  type RecordsPage,
  type RecordsQuery,
  type ReviewFlagInput,
  type ReviewedFlag,
} from "./r16-schemas";
import type {
  Administrator,
  AppVersion,
  AuditEvent,
  Business,
  BusinessDetail,
  DashboardSummary,
  Device,
  ListResult,
  ProblemReport,
  ProblemReportDetail,
  ProblemReportUpdateResult,
  ServiceError,
  ServiceErrorCode,
  ServiceMeta,
  ServiceResult,
  Stall,
  SyncEvent,
  SystemHealth,
  User,
  UserDetail,
} from "./schemas";
import {
  parkedAdminServiceMethods,
  type AdminService,
  type AdminServiceMethod,
} from "./service";

/**
 * The R16 Core adapter (ADM-048, spec §5.2). Each method is one PostgREST
 * RPC, always POSTed (`/rest/v1/rpc/<fn>`, D5: the readers are VOLATILE
 * because they log), with KitaMo's anon key as `apikey` and the signed-in
 * administrator's own aal2 token as the bearer. No service-role key exists
 * here. Core's km_admin_can is the gate; this adapter only maps replies:
 *
 * - every reply is parsed strictly (core-schemas.ts): an unknown key, a
 *   missing key or a wrong type answers SERVICE_UNAVAILABLE and nothing
 *   reaches a page;
 * - KM005 → FORBIDDEN (one "Not permitted" state for every refusal),
 *   KM003 → VALIDATION_ERROR with its reason, KM015 → CONFLICT,
 *   PGRST202 → NOT_AVAILABLE, a refused token → UNAUTHORIZED;
 * - a 6 s timeout → TIMEOUT.
 */

export const CORE_TIMEOUT_MS = 6_000;

/** The only RPCs that write, and they write Core's admin log only (OQ21). */
export const CORE_WRITE_RPCS = [
  "open_admin_access",
  "close_admin_access",
  "raise_admin_flag",
  "review_admin_flag",
] as const;

/** The readers (each logged by Core) and the unlogged session read. */
export const CORE_READ_RPCS = [
  "km_admin_session",
  "km_admin_directory",
  "km_admin_business_summary",
  "km_admin_business_records",
  "km_admin_flags",
  "km_admin_access_log",
  "km_admin_associations",
] as const;

export type CoreRpc =
  (typeof CORE_WRITE_RPCS)[number] | (typeof CORE_READ_RPCS)[number];

export type CoreConnection = { url: string; anonKey: string };

/** KitaMo's Supabase URL and anon key, by env name only (never committed). */
export function coreConnectionFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): CoreConnection | null {
  const url = env.KITAMO_SUPABASE_URL;
  const anonKey = env.KITAMO_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/+$/, ""), anonKey };
}

export type CoreAdminServiceOptions = CoreConnection & {
  /** The administrator's aal2 access token; kept private to this object. */
  accessToken: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

type Fault = {
  code: ServiceErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
};

const NOT_PERMITTED: Fault = {
  code: "FORBIDDEN",
  message: "Not permitted.",
  retryable: false,
};

export class CoreAdminService implements AdminService {
  readonly #url: string;
  readonly #anonKey: string;
  readonly #accessToken: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor(options: CoreAdminServiceOptions) {
    if (!options.url || !options.anonKey || !options.accessToken) {
      throw new Error("The Core adapter needs a URL, an anon key and a token.");
    }
    this.#url = options.url.replace(/\/+$/, "");
    this.#anonKey = options.anonKey;
    this.#accessToken = options.accessToken;
    this.#fetch = options.fetchImpl ?? fetch;
    this.#timeoutMs = options.timeoutMs ?? CORE_TIMEOUT_MS;
  }

  /** Never print the token (e.g. if this object reaches a log). */
  toJSON(): Record<string, string> {
    return { adapter: "core" };
  }

  // -- R16 ------------------------------------------------------------------

  getSession(): Promise<ServiceResult<AdminSessionState>> {
    return this.#rpc(
      "km_admin_session",
      {},
      parseSessionReply,
      adminSessionStateSchema,
    );
  }

  async getOverview(): Promise<ServiceResult<Overview>> {
    const page = await this.#rpc(
      "km_admin_directory",
      { p_search: null, p_after: null, p_limit: 1 },
      parseDirectoryReply,
      directoryPageSchema,
    );
    if (!page.ok) return page;
    return {
      ok: true,
      data: overviewSchema.parse({ totals: page.data.totals }),
      meta: page.meta,
    };
  }

  listDirectory(
    query: DirectoryQuery = {},
  ): Promise<ServiceResult<DirectoryPage>> {
    return this.#withInput(directoryQuerySchema, query, (input) =>
      this.#rpc(
        "km_admin_directory",
        {
          p_search:
            input.search === undefined || input.search === ""
              ? null
              : input.search,
          p_after: input.after ?? null,
          p_limit: input.limit ?? 50,
        },
        parseDirectoryReply,
        directoryPageSchema,
      ),
    );
  }

  openAccess(input: OpenAccessInput): Promise<ServiceResult<OpenedAccess>> {
    return this.#withInput(openAccessInputSchema, input, (value) =>
      this.#rpc(
        "open_admin_access",
        {
          p_business_id: value.businessId,
          p_level: value.level,
          p_reason_code: value.reasonCode,
          p_reason_text: value.reasonText,
          p_flag_id: value.flagId,
          p_reference: value.reference,
          p_withhold_code: value.withholdCode,
          p_withhold_days: value.withholdDays,
          p_client_request_id: value.clientRequestId,
        },
        parseOpenReply,
        openedAccessSchema,
      ),
    );
  }

  closeAccess(input: CloseAccessInput): Promise<ServiceResult<ClosedAccess>> {
    return this.#withInput(closeAccessInputSchema, input, (value) =>
      this.#rpc(
        "close_admin_access",
        {
          p_access_id: value.accessId,
          p_client_request_id: value.clientRequestId,
        },
        parseCloseReply,
        closedAccessSchema,
      ),
    );
  }

  getBusinessSummary(
    businessId: string,
  ): Promise<ServiceResult<BusinessSummary>> {
    return this.#withInput(coreIdSchema, businessId, (id) =>
      this.#rpc(
        "km_admin_business_summary",
        { p_business_id: id },
        parseSummaryReply,
        businessSummarySchema,
      ),
    );
  }

  getBusinessRecords(query: RecordsQuery): Promise<ServiceResult<RecordsPage>> {
    return this.#withInput(recordsQuerySchema, query, async (value) => {
      const result = await this.#rpc(
        "km_admin_business_records",
        {
          p_business_id: value.businessId,
          p_kind: value.kind,
          p_from: value.from,
          p_to: value.to,
        },
        parseRecordsReply,
        recordsPageSchema,
      );
      if (result.ok && result.data.kind !== value.kind) {
        return this.#failure(result.meta, {
          code: "SERVICE_UNAVAILABLE",
          message: "Core answered with another kind of records.",
          retryable: false,
        });
      }
      return result;
    });
  }

  listFlags(
    query: FlagsQuery = { status: null },
  ): Promise<ServiceResult<Flag[]>> {
    return this.#withInput(flagsQuerySchema, query, (value) =>
      this.#rpc(
        "km_admin_flags",
        { p_status: value.status },
        parseFlagsReply,
        flagListSchema,
      ),
    );
  }

  raiseFlag(input: RaiseFlagInput): Promise<ServiceResult<RaisedFlag>> {
    return this.#withInput(raiseFlagInputSchema, input, (value) =>
      this.#rpc(
        "raise_admin_flag",
        {
          p_business_id: value.businessId,
          p_kind: value.kind,
          p_source: value.source,
          p_evidence: value.evidence,
          p_client_request_id: value.clientRequestId,
        },
        parseRaiseReply,
        raisedFlagSchema,
      ),
    );
  }

  reviewFlag(input: ReviewFlagInput): Promise<ServiceResult<ReviewedFlag>> {
    return this.#withInput(reviewFlagInputSchema, input, (value) =>
      this.#rpc(
        "review_admin_flag",
        {
          p_flag_id: value.flagId,
          p_status: value.status,
          p_note: value.note,
          p_client_request_id: value.clientRequestId,
        },
        parseReviewReply,
        reviewedFlagSchema,
      ),
    );
  }

  listAccessLog(
    query: AccessLogQuery = { before: null },
  ): Promise<ServiceResult<AccessLog>> {
    return this.#withInput(accessLogQuerySchema, query, (value) =>
      this.#rpc(
        "km_admin_access_log",
        { p_before: value.before },
        parseAccessLogReply,
        accessLogSchema,
      ),
    );
  }

  listAssociations(): Promise<ServiceResult<Association[]>> {
    return this.#rpc(
      "km_admin_associations",
      {},
      parseAssociationsReply,
      associationListSchema,
    );
  }

  // -- Parked mock-first methods (R23) ---------------------------------------

  getDashboardSummary(): Promise<ServiceResult<DashboardSummary>> {
    return this.#parked("getDashboardSummary");
  }
  listUsers(): Promise<ServiceResult<ListResult<User>>> {
    return this.#parked("listUsers");
  }
  getUser(): Promise<ServiceResult<UserDetail>> {
    return this.#parked("getUser");
  }
  listBusinesses(): Promise<ServiceResult<ListResult<Business>>> {
    return this.#parked("listBusinesses");
  }
  getBusiness(): Promise<ServiceResult<BusinessDetail>> {
    return this.#parked("getBusiness");
  }
  listStalls(): Promise<ServiceResult<ListResult<Stall>>> {
    return this.#parked("listStalls");
  }
  listDevices(): Promise<ServiceResult<ListResult<Device>>> {
    return this.#parked("listDevices");
  }
  listSyncEvents(): Promise<ServiceResult<ListResult<SyncEvent>>> {
    return this.#parked("listSyncEvents");
  }
  listProblemReports(): Promise<ServiceResult<ListResult<ProblemReport>>> {
    return this.#parked("listProblemReports");
  }
  getProblemReport(): Promise<ServiceResult<ProblemReportDetail>> {
    return this.#parked("getProblemReport");
  }
  updateProblemReportMock(): Promise<ServiceResult<ProblemReportUpdateResult>> {
    return this.#parked("updateProblemReportMock");
  }
  listAppVersions(): Promise<ServiceResult<ListResult<AppVersion>>> {
    return this.#parked("listAppVersions");
  }
  listAuditEvents(): Promise<ServiceResult<ListResult<AuditEvent>>> {
    return this.#parked("listAuditEvents");
  }
  listAdministrators(): Promise<ServiceResult<ListResult<Administrator>>> {
    return this.#parked("listAdministrators");
  }
  getSystemHealth(): Promise<ServiceResult<SystemHealth>> {
    return this.#parked("getSystemHealth");
  }

  // -- Internals --------------------------------------------------------------

  async #parked<T>(
    method: (typeof parkedAdminServiceMethods)[number] & AdminServiceMethod,
  ): Promise<ServiceResult<T>> {
    return this.#failure(meta(0), {
      code: "NOT_AVAILABLE",
      message:
        "This view is parked until R23; it is not part of the R16 admin site.",
      retryable: false,
      details: { method },
    });
  }

  async #withInput<I, T>(
    schema: z.ZodType<I>,
    input: unknown,
    run: (value: I) => Promise<ServiceResult<T>>,
  ): Promise<ServiceResult<T>> {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return this.#failure(meta(0), {
        code: "VALIDATION_ERROR",
        message: "The request is not valid.",
        retryable: false,
        details: {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    }
    return run(parsed.data);
  }

  async #rpc<T>(
    fn: CoreRpc,
    params: Record<string, unknown>,
    parse: (body: unknown) => T,
    domain: z.ZodType<T>,
  ): Promise<ServiceResult<T>> {
    const started = Date.now();
    let response: Response;
    try {
      response = await this.#fetch(`${this.#url}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: {
          apikey: this.#anonKey,
          Authorization: `Bearer ${this.#accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(this.#timeoutMs),
        cache: "no-store",
      });
    } catch (error) {
      const timedOut =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      return this.#failure(meta(Date.now() - started), {
        code: timedOut ? "TIMEOUT" : "SERVICE_UNAVAILABLE",
        message: timedOut
          ? "KitaMo did not answer in time. Try again."
          : "KitaMo could not be reached. Try again.",
        retryable: true,
      });
    }
    const latency = Date.now() - started;
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      return this.#failure(meta(latency), faultOf(response.status, body));
    }
    try {
      const data = domain.parse(parse(body));
      return { ok: true, data, meta: meta(latency) };
    } catch {
      // Fail closed: an unexpected key, a missing key or a wrong type means
      // this site and Core disagree on the contract. Nothing is rendered.
      return this.#failure(meta(latency), {
        code: "SERVICE_UNAVAILABLE",
        message: "KitaMo answered in a shape this site does not accept.",
        retryable: false,
        details: { contract: fn },
      });
    }
  }

  #failure<T>(serviceMeta: ServiceMeta, fault: Fault): ServiceResult<T> {
    const error: ServiceError = {
      code: fault.code,
      message: fault.message,
      retryable: fault.retryable,
      correlationId: serviceMeta.requestId,
      ...(fault.details === undefined ? {} : { details: fault.details }),
    };
    return { ok: false, error, meta: serviceMeta };
  }
}

function meta(latencyMs: number): ServiceMeta {
  return {
    requestId: `core-${crypto.randomUUID()}`,
    source: "core",
    generatedAt: new Date().toISOString(),
    scenario: null,
    stale: false,
    latencyMs: Math.max(0, Math.round(latencyMs)),
    warnings: [],
  };
}

/** Maps PostgREST's error reply to the site's one set of states. */
export function faultOf(status: number, body: unknown): Fault {
  const parsed = postgrestErrorSchema.safeParse(body);
  const code = parsed.success ? (parsed.data.code ?? "") : "";
  if (code === "KM005") return NOT_PERMITTED;
  if (code === "KM003") {
    const reason = km003Reason(parsed.success ? parsed.data.details : null);
    return {
      code: "VALIDATION_ERROR",
      message: "KitaMo refused the request as incomplete or invalid.",
      retryable: false,
      details: { reason: reason ?? "input" },
    };
  }
  if (code === "KM015") {
    return {
      code: "CONFLICT",
      message: "Request details changed.",
      retryable: false,
    };
  }
  if (code === "PGRST202" || (status === 404 && code.startsWith("PGRST"))) {
    return {
      code: "NOT_AVAILABLE",
      message: "This part of KitaMo is not available yet.",
      retryable: false,
    };
  }
  if (status === 401 || /^PGRST30\d$/.test(code)) {
    return {
      code: "UNAUTHORIZED",
      message: "Your sign-in has ended. Sign in again.",
      retryable: false,
    };
  }
  // 42501: no EXECUTE for this role. Answered as the one refusal.
  if (status === 403 || code === "42501") return NOT_PERMITTED;
  if (status >= 500) {
    return {
      code: "SERVICE_UNAVAILABLE",
      message: "KitaMo could not answer right now. Try again.",
      retryable: true,
    };
  }
  return {
    code: "UNKNOWN",
    message: "The request could not be completed safely.",
    retryable: false,
  };
}

export const createCoreAdminService = (
  options: CoreAdminServiceOptions,
): AdminService => new CoreAdminService(options);
