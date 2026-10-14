import { describe, expect, it } from "vitest";

import {
  CORE_WRITE_RPCS,
  CoreAdminService,
  coreConnectionFromEnv,
  getAdminService,
  parkedAdminServiceMethods,
  type ServiceResult,
} from "@/lib/admin";
import { faultOf } from "@/lib/admin/core-service";

const URL_BASE = "https://kitamo-test.supabase.co";
const BIZ = "0b000000-0000-4000-8000-000000000001";
const ACCESS = "0a000000-0000-4000-8000-000000000001";
const FLAG = "0f000000-0000-4000-8000-000000000001";
const REQ = "0c000000-0000-4000-8000-000000000001";
const TS = "2026-10-14T05:20:00.123456+00:00";

type Call = { url: string; method: string; headers: Headers; body: unknown };

function core(
  reply: (call: Call) => { status: number; body: unknown } | Promise<never>,
) {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const call: Call = {
      url: String(input),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body:
        init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    };
    calls.push(call);
    const result = await reply(call);
    return new Response(JSON.stringify(result.body), { status: result.status });
  };
  const service = new CoreAdminService({
    url: `${URL_BASE}/`,
    anonKey: "anon-test",
    accessToken: "admin-aal2-token",
    fetchImpl,
  });
  return { calls, service };
}

const ok = (body: unknown) => () => ({ status: 200, body });
const fail = (status: number, body: unknown) => () => ({ status, body });

function expectOk<T>(
  result: ServiceResult<T>,
): asserts result is Extract<ServiceResult<T>, { ok: true }> {
  if (!result.ok)
    throw new Error(`${result.error.code}: ${result.error.message}`);
}

// Core's replies, key for key as sr-admin-0083-0084.md §3.2 allowlists them.
const SESSION = {
  label: "Owner",
  accesses: [
    {
      access_id: ACCESS,
      business_id: BIZ,
      business_name: "Bite Delight",
      level: "summary",
      reason_code: "support_request",
      expires_at: TS,
    },
  ],
};
const DIRECTORY = {
  totals: {
    businesses: 3,
    live: 2,
    hidden: 1,
    active_7d: 2,
    with_open_flags: 1,
  },
  rows: [
    {
      business_id: BIZ,
      name: "Bite Delight",
      created_on: "2026-08-01",
      last_sale_day: "2026-10-13",
      sales_7d: 41,
      stall_count: 2,
      staff_count: 3,
      apps_on: ["insights"],
      open_flags: 1,
      hidden: false,
    },
  ],
  next: null,
};
const DAYS = Array.from({ length: 14 }, (_, index) => ({
  day: `2026-10-${String(index + 1).padStart(2, "0")}`,
  sales_count: 3,
  sales_cents: 15_000,
  returns_count: 0,
  returns_cents: 0,
}));
const SUMMARY = {
  business: {
    business_id: BIZ,
    name: "Bite Delight",
    created_on: "2026-08-01",
    timezone: "Asia/Manila",
    hidden_since: null,
  },
  stalls: [{ stall_id: "0d000000-0000-4000-8000-000000000001", name: "Main" }],
  staff_count: 3,
  days: DAYS,
  health: {
    stock_use_issues_7d: 1,
    ticket_issues_7d: 0,
    problem_reports_7d: 0,
    staff_code_failures_1d: 2,
    correction_requests_open: 0,
  },
  apps: [{ grantee: "insights", scope: "use", since: TS }],
  settings: { ticket_mode: "off", owner_pin_set: true, payment_qr_count: 1 },
  flags: [
    {
      flag_id: FLAG,
      kind: "health_mismatch",
      source: "health",
      status: "open",
      created_at: TS,
    },
  ],
};
const SALES = {
  kind: "sales",
  from: "2026-10-01",
  to: "2026-10-07",
  more: false,
  rows: [
    {
      sale_id: "0e000000-0000-4000-8000-000000000001",
      happened_at: TS,
      stall_id: null,
      transaction_no: 1042,
      amount_cents: 12_500,
      discount_cents: 0,
      payment_method: "cash",
      voided_at: null,
      return_kind: null,
      return_cents: null,
      customer_id: null,
      customer_name: null,
      line_count: 2,
      recorded_by_label: "Joy",
    },
  ],
};
const FLAGS = [
  {
    flag_id: FLAG,
    business_id: BIZ,
    business_name: "Bite Delight",
    kind: "health_mismatch",
    source: "health",
    status: "open",
    evidence: { counts: { stock_use_issues_7d: 4 }, check: "stock_use" },
    created_at: TS,
    closed_at: null,
  },
];
const ACCESS_LOG = {
  accesses: [
    {
      access_id: ACCESS,
      admin_label: "Owner",
      business_id: BIZ,
      business_name: null,
      level: "records",
      reason_code: "flag_review",
      reason_text: null,
      flag_id: FLAG,
      reference: null,
      opened_at: TS,
      expires_at: TS,
      ended_at: TS,
      ended_how: "expired",
      withheld_until: null,
      reads: 2,
    },
  ],
  reads: [
    {
      fn: "km_admin_directory",
      business_id: null,
      access_id: null,
      rows_returned: 50,
      at: TS,
    },
  ],
};

describe("the Core adapter: transport", () => {
  it("POSTs every call to /rest/v1/rpc/<fn> with the anon key and the admin's own token", async () => {
    const { calls, service } = core(ok(SESSION));
    expectOk(await service.getSession());
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe(`${URL_BASE}/rest/v1/rpc/km_admin_session`);
    expect(calls[0]?.headers.get("apikey")).toBe("anon-test");
    expect(calls[0]?.headers.get("authorization")).toBe(
      "Bearer admin-aal2-token",
    );
    expect(calls[0]?.body).toEqual({});
  });

  it("names Core's parameters exactly", async () => {
    const { calls, service } = core(ok(DIRECTORY));
    await service.listDirectory({ search: "bite", limit: 50 });
    expect(calls[0]?.body).toEqual({
      p_search: "bite",
      p_after: null,
      p_limit: 50,
    });
    const open = core(() => ({
      status: 200,
      body: {
        access_id: ACCESS,
        business_id: BIZ,
        level: "records",
        opened_at: TS,
        expires_at: TS,
        withheld_until: null,
      },
    }));
    expectOk(
      await open.service.openAccess({
        businessId: BIZ,
        level: "records",
        reasonCode: "flag_review",
        reasonText: "Stock use does not add up for a week.",
        flagId: FLAG,
        reference: null,
        withholdCode: null,
        withholdDays: null,
        clientRequestId: REQ,
      }),
    );
    expect(open.calls[0]?.url).toMatch(/\/rpc\/open_admin_access$/);
    expect(open.calls[0]?.body).toEqual({
      p_business_id: BIZ,
      p_level: "records",
      p_reason_code: "flag_review",
      p_reason_text: "Stock use does not add up for a week.",
      p_flag_id: FLAG,
      p_reference: null,
      p_withhold_code: null,
      p_withhold_days: null,
      p_client_request_id: REQ,
    });
  });

  it("answers TIMEOUT after its time limit, and never throws", async () => {
    const calls: string[] = [];
    const slow: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        calls.push("called");
        init?.signal?.addEventListener("abort", () =>
          reject(
            Object.assign(new Error("timed out"), { name: "TimeoutError" }),
          ),
        );
      });
    const service = new CoreAdminService({
      url: URL_BASE,
      anonKey: "anon",
      accessToken: "t",
      fetchImpl: slow,
      timeoutMs: 20,
    });
    const result = await service.getSession();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TIMEOUT");
      expect(result.error.retryable).toBe(true);
    }
    expect(calls).toHaveLength(1);
  });

  it("checks input before calling Core (records without evidence never leave)", async () => {
    const { calls, service } = core(ok({}));
    const result = await service.openAccess({
      businessId: BIZ,
      level: "records",
      reasonCode: "support_request",
      reasonText: "A long enough written reason.",
      flagId: null,
      reference: null,
      withholdCode: null,
      withholdDays: null,
      clientRequestId: REQ,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(calls).toHaveLength(0);
  });

  it("keeps the token out of serialisation", () => {
    const { service } = core(ok(SESSION));
    expect(JSON.stringify(service)).not.toContain("admin-aal2-token");
  });
});

describe("the Core adapter: strict replies (fail closed)", () => {
  it("maps each allowlisted reply into the domain contract, timestamps in UTC", async () => {
    const session = await core(ok(SESSION)).service.getSession();
    expectOk(session);
    expect(session.data.accesses[0]).toEqual({
      accessId: ACCESS,
      businessId: BIZ,
      businessName: "Bite Delight",
      level: "summary",
      reasonCode: "support_request",
      expiresAt: "2026-10-14T05:20:00.123Z",
    });

    const directory = await core(ok(DIRECTORY)).service.listDirectory();
    expectOk(directory);
    expect(directory.data.totals).toEqual({
      businesses: 3,
      live: 2,
      hidden: 1,
      active7d: 2,
      withOpenFlags: 1,
    });
    expect(directory.data.rows[0]?.sales7d).toBe(41);

    const overviewCore = core(ok(DIRECTORY));
    const overview = await overviewCore.service.getOverview();
    expectOk(overview);
    expect(overview.data.totals.withOpenFlags).toBe(1);
    // §12.2: the Overview asks for the totals only (a limit of 0, no rows).
    expect(overviewCore.calls[0]?.body).toEqual({
      p_search: null,
      p_after: null,
      p_limit: 0,
    });

    const summary = await core(ok(SUMMARY)).service.getBusinessSummary(BIZ);
    expectOk(summary);
    expect(summary.data.health.staffCodeFailures1d).toBe(2);
    expect(summary.data.days).toHaveLength(14);

    const records = await core(ok(SALES)).service.getBusinessRecords({
      businessId: BIZ,
      kind: "sales",
      from: "2026-10-01",
      to: "2026-10-07",
    });
    expectOk(records);
    expect(
      records.data.kind === "sales" && records.data.rows[0]?.transactionNo,
    ).toBe("1042");

    const flags = await core(ok(FLAGS)).service.listFlags({ status: null });
    expectOk(flags);
    expect(flags.data[0]?.evidence).toEqual({
      counts: { stock_use_issues_7d: 4 },
      check: "stock_use",
    });

    const log = await core(ok(ACCESS_LOG)).service.listAccessLog({
      before: null,
    });
    expectOk(log);
    expect(log.data.accesses[0]?.reasonText).toBeNull();
    expect(log.data.reads[0]?.fn).toBe("km_admin_directory");
  });

  const extraKey: [string, () => Promise<ServiceResult<unknown>>][] = [
    [
      "session",
      () => core(ok({ ...SESSION, email: "x@y.z" })).service.getSession(),
    ],
    [
      "a directory row",
      () =>
        core(
          ok({
            ...DIRECTORY,
            rows: [{ ...DIRECTORY.rows[0], total_cents: 1 }],
          }),
        ).service.listDirectory(),
    ],
    [
      "the summary's business",
      () =>
        core(
          ok({
            ...SUMMARY,
            business: { ...SUMMARY.business, owner_email: "x" },
          }),
        ).service.getBusinessSummary(BIZ),
    ],
    [
      "a credit row",
      () =>
        core(
          ok({
            kind: "credit",
            from: null,
            to: null,
            more: false,
            rows: [
              {
                customer_id: BIZ,
                name: "Ate Liza",
                balance_cents: 100,
                oldest_unpaid_on: null,
                last_payment_at: null,
                phone: "0917",
              },
            ],
          }),
        ).service.getBusinessRecords({
          businessId: BIZ,
          kind: "credit",
          from: null,
          to: null,
        }),
    ],
    [
      "flag evidence with text",
      () =>
        core(
          ok([{ ...FLAGS[0], evidence: { note: "suspicious" } }]),
        ).service.listFlags({ status: null }),
    ],
    [
      "flag evidence with money",
      () =>
        core(
          ok([{ ...FLAGS[0], evidence: { counts: { total_cents: 5 } } }]),
        ).service.listFlags({ status: null }),
    ],
  ];
  for (const [what, call] of extraKey) {
    it(`refuses an unknown key in ${what} and renders nothing`, async () => {
      const result = await call();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("SERVICE_UNAVAILABLE");
        expect(JSON.stringify(result.error)).not.toMatch(
          /x@y\.z|0917|suspicious/,
        );
      }
    });
  }

  it("refuses a missing key, a wrong type, and 13 days instead of 14", async () => {
    const noLabel = { accesses: SESSION.accesses };
    for (const result of [
      await core(ok(noLabel)).service.getSession(),
      await core(ok({ ...DIRECTORY, next: 7 })).service.listDirectory(),
      await core(
        ok({ ...SUMMARY, days: DAYS.slice(1) }),
      ).service.getBusinessSummary(BIZ),
    ]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("SERVICE_UNAVAILABLE");
    }
  });

  it("refuses records of another kind than asked for", async () => {
    const result = await core(
      ok({ ...SALES, kind: "audit", rows: [] }),
    ).service.getBusinessRecords({
      businessId: BIZ,
      kind: "sales",
      from: "2026-10-01",
      to: "2026-10-07",
    });
    expect(result.ok).toBe(false);
  });
});

describe("the Core adapter: refusals", () => {
  const error = (status: number, body: unknown) => () => ({ status, body });

  it("maps KM005 to the one not-permitted state", async () => {
    const result = await core(
      error(400, {
        code: "KM005",
        message: "Not permitted.",
        details: null,
        hint: null,
      }),
    ).service.getBusinessSummary(BIZ);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
      expect(result.error.message).toBe("Not permitted.");
    }
  });

  it("maps KM003 with its detail.reason, KM015, PGRST202, a refused token and outages", () => {
    expect(
      faultOf(400, {
        code: "KM003",
        details: JSON.stringify({ reason: "too_many" }),
      }),
    ).toMatchObject({
      code: "VALIDATION_ERROR",
      details: { reason: "too_many" },
    });
    expect(faultOf(400, { code: "KM003", details: "not json" })).toMatchObject({
      details: { reason: "input" },
    });
    expect(faultOf(400, { code: "KM015" }).code).toBe("CONFLICT");
    expect(faultOf(404, { code: "PGRST202" }).code).toBe("NOT_AVAILABLE");
    expect(faultOf(401, { code: "PGRST301" }).code).toBe("UNAUTHORIZED");
    expect(faultOf(403, { code: "42501" }).code).toBe("FORBIDDEN");
    expect(faultOf(503, null)).toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      retryable: true,
    });
  });

  it("answers NOT_AVAILABLE for associations until 0086 exists", async () => {
    const result = await core(
      error(404, { code: "PGRST202", message: "Could not find the function" }),
    ).service.listAssociations();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_AVAILABLE");
  });

  it("serves no parked mock-first method, and calls nothing for them", async () => {
    const { calls, service } = core(ok({}));
    for (const method of parkedAdminServiceMethods) {
      const call = service[method] as () => Promise<ServiceResult<unknown>>;
      const result = await call.call(service);
      expect(result.ok, method).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_AVAILABLE");
    }
    expect(calls).toHaveLength(0);
  });

  it("has exactly nine write RPCs: Core's admin log and the association records", () => {
    expect([...CORE_WRITE_RPCS].sort()).toEqual([
      "admin_add_association_officer",
      "admin_close_association",
      "admin_create_association",
      "admin_end_association_officer",
      "admin_rotate_association_code",
      "close_admin_access",
      "open_admin_access",
      "raise_admin_flag",
      "review_admin_flag",
    ]);
  });
});

const ASSOCIATION = "0d000000-0000-4000-8000-000000000001";
const OFFICER = "0e000000-0000-4000-8000-000000000001";
const ASSOCIATIONS = [
  {
    association_id: ASSOCIATION,
    name: "Villa Rosa Homeowners",
    kind: "hoa",
    status: "live",
    member_stall_count: 4,
    officer_count: 1,
    code_rotated_at: TS,
  },
];
const ASSOCIATION_DETAIL = {
  association_id: ASSOCIATION,
  name: "Malanday Market Vendors",
  kind: "barangay",
  status: "live",
  area: "Malanday public market",
  join_code: "K7Q4X9RM",
  code_rotated_at: null,
  officers: [
    {
      officer_id: OFFICER,
      label: "Kap. Ramon A.",
      added_at: TS,
      accepted_at: null,
      ended_at: null,
    },
  ],
};

describe("the Core adapter: associations (0086, §12.12, §12.15)", () => {
  it("names 0086's parameters exactly", async () => {
    const { calls, service } = core(ok({ done: "whatever Core answers" }));
    await service.addAssociationOfficer({
      associationId: ASSOCIATION,
      email: "juan@example.test",
      label: "Juan D., President",
      clientRequestId: REQ,
    });
    await service.endAssociationOfficer({
      officerId: OFFICER,
      clientRequestId: REQ,
    });
    await service.rotateAssociationCode({
      associationId: ASSOCIATION,
      clientRequestId: REQ,
    });
    await service.closeAssociation({
      associationId: ASSOCIATION,
      clientRequestId: REQ,
    });
    expect(
      calls.map((call) => [call.url.split("/rpc/")[1], call.body]),
    ).toEqual([
      [
        "admin_add_association_officer",
        {
          p_association_id: ASSOCIATION,
          p_email: "juan@example.test",
          p_label: "Juan D., President",
          p_client_request_id: REQ,
        },
      ],
      [
        "admin_end_association_officer",
        { p_officer_id: OFFICER, p_client_request_id: REQ },
      ],
      [
        "admin_rotate_association_code",
        { p_association_id: ASSOCIATION, p_client_request_id: REQ },
      ],
      [
        "admin_close_association",
        { p_association_id: ASSOCIATION, p_client_request_id: REQ },
      ],
    ]);
    const created = core(
      ok({ association_id: ASSOCIATION, join_code: "P3RT8HWZ" }),
    );
    const result = await created.service.createAssociation({
      name: "Villa Rosa Homeowners",
      kind: "hoa",
      area: null,
      letterReference: "VR-HOA-2026-014",
      clientRequestId: REQ,
    });
    expect(created.calls[0]?.body).toEqual({
      p_name: "Villa Rosa Homeowners",
      p_kind: "hoa",
      p_area: null,
      p_letter_reference: "VR-HOA-2026-014",
      p_client_request_id: REQ,
    });
    expect(result.ok && result.data).toEqual({
      associationId: ASSOCIATION,
      joinCode: "P3RT8HWZ",
    });
    const detail = core(ok(ASSOCIATION_DETAIL));
    await detail.service.getAssociation(ASSOCIATION);
    expect(detail.calls[0]?.body).toEqual({ p_association_id: ASSOCIATION });
  });

  it("maps the list with its kind, and the detail with its officers (no email)", async () => {
    const list = await core(ok(ASSOCIATIONS)).service.listAssociations();
    expect(list.ok && list.data).toEqual([
      {
        associationId: ASSOCIATION,
        name: "Villa Rosa Homeowners",
        kind: "hoa",
        status: "live",
        memberStallCount: 4,
        officerCount: 1,
        codeRotatedAt: "2026-10-14T05:20:00.123Z",
      },
    ]);
    const detail = await core(ok(ASSOCIATION_DETAIL)).service.getAssociation(
      ASSOCIATION,
    );
    expect(detail.ok && detail.data).toEqual({
      associationId: ASSOCIATION,
      name: "Malanday Market Vendors",
      kind: "barangay",
      status: "live",
      area: "Malanday public market",
      joinCode: "K7Q4X9RM",
      codeRotatedAt: null,
      officers: [
        {
          officerId: OFFICER,
          label: "Kap. Ramon A.",
          addedAt: "2026-10-14T05:20:00.123Z",
          acceptedAt: null,
          endedAt: null,
        },
      ],
    });
  });

  it("fails closed on a row without its kind, an unknown kind, an officer's email or a bad code", async () => {
    const { kind: _kind, ...noKind } = ASSOCIATIONS[0] ?? {};
    void _kind;
    for (const result of [
      await core(ok([noKind])).service.listAssociations(),
      await core(
        ok([{ ...ASSOCIATIONS[0], kind: "village" }]),
      ).service.listAssociations(),
      await core(
        ok({
          ...ASSOCIATION_DETAIL,
          officers: [{ ...ASSOCIATION_DETAIL.officers[0], email: "x@y.z" }],
        }),
      ).service.getAssociation(ASSOCIATION),
      await core(
        ok({ ...ASSOCIATION_DETAIL, member_stalls: ["Tindahan ni Rosa"] }),
      ).service.getAssociation(ASSOCIATION),
      await core(
        ok({ ...ASSOCIATION_DETAIL, join_code: "K7Q4-X9RM" }),
      ).service.getAssociation(ASSOCIATION),
      await core(
        ok({ association_id: ASSOCIATION, join_code: "K7Q4X9RM", extra: 1 }),
      ).service.createAssociation({
        name: "Villa Rosa Homeowners",
        kind: "hoa",
        area: null,
        letterReference: "VR-HOA-2026-014",
        clientRequestId: REQ,
      }),
    ]) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("SERVICE_UNAVAILABLE");
        expect(JSON.stringify(result.error)).not.toMatch(/x@y\.z|Rosa/);
      }
    }
  });

  it("checks input first (an unknown kind never leaves), and maps KM003 kind and officer", async () => {
    const { calls, service } = core(ok({}));
    const bad = await service.createAssociation({
      name: "Villa Rosa Homeowners",
      kind: "village" as "hoa",
      area: null,
      letterReference: "VR-HOA-2026-014",
      clientRequestId: REQ,
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("VALIDATION_ERROR");
    expect(calls).toHaveLength(0);
    const refused = await core(
      fail(400, {
        code: "KM003",
        message: "Invalid request.",
        details: JSON.stringify({ reason: "officer" }),
      }),
    ).service.addAssociationOfficer({
      associationId: ASSOCIATION,
      email: "unknown@example.test",
      label: "Juan D., President",
      clientRequestId: REQ,
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.error).toMatchObject({
        code: "VALIDATION_ERROR",
        details: { reason: "officer" },
      });
    }
  });

  it("takes Core's 500-row list whole, and fails closed past it", async () => {
    const rows = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        ...ASSOCIATIONS[0],
        association_id: `0d000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      }));
    const full = await core(ok(rows(500))).service.listAssociations();
    expect(full.ok && full.data.length).toBe(500);
    const over = await core(ok(rows(501))).service.listAssociations();
    expect(over.ok).toBe(false);
  });

  it("answers NOT_AVAILABLE for every association method until 0086 exists", async () => {
    const missing = () =>
      core(fail(404, { code: "PGRST202", message: "Could not find" })).service;
    for (const result of [
      await missing().getAssociation(ASSOCIATION),
      await missing().rotateAssociationCode({
        associationId: ASSOCIATION,
        clientRequestId: REQ,
      }),
    ]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_AVAILABLE");
    }
  });
});

describe("choosing the adapter", () => {
  it("reads KitaMo's Supabase URL and anon key by env name only", () => {
    expect(coreConnectionFromEnv({} as NodeJS.ProcessEnv)).toBeNull();
    expect(
      coreConnectionFromEnv({
        KITAMO_SUPABASE_URL: `${URL_BASE}/`,
        KITAMO_SUPABASE_ANON_KEY: "anon",
      } as unknown as NodeJS.ProcessEnv),
    ).toEqual({ url: URL_BASE, anonKey: "anon" });
  });

  it("uses Core with a token, and never the mock in production", async () => {
    const { vi } = await import("vitest");
    vi.stubEnv("KITAMO_SUPABASE_URL", URL_BASE);
    vi.stubEnv("KITAMO_SUPABASE_ANON_KEY", "anon");
    expect(getAdminService("token")).toBeInstanceOf(CoreAdminService);
    vi.stubEnv("KITAMO_SUPABASE_URL", "");
    expect(() => getAdminService("token")).toThrow("not configured");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getAdminService()).toThrow("not configured");
    vi.unstubAllEnvs();
  });
});
