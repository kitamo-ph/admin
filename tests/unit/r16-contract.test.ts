import { describe, expect, it } from "vitest";

import {
  CoreAdminService,
  createMockAdminService,
  type AdminService,
  type ServiceResult,
} from "@/lib/admin";
import { MOCK_R16_BUSINESS_IDS } from "@/lib/admin/mock-r16";

import { createFakeCore, fakeCoreFetch } from "../support/fake-core";

/**
 * ADM-021: the mock and Core adapters answer the same contract. The Core
 * adapter runs against the fake Core (Core-shaped replies over a stubbed
 * fetch; no hosted call). Both get the same clock, which the tests move.
 */
type Harness = { service: AdminService; advance: (ms: number) => void };

const START = Date.UTC(2026, 9, 14, 6, 0, 0);
const BIZ = MOCK_R16_BUSINESS_IDS[0] ?? "";
const OTHER = MOCK_R16_BUSINESS_IDS[1] ?? "";
const REASON = "The owner asked why yesterday's tally is off.";

function mockHarness(): Harness {
  let now = START;
  return {
    service: createMockAdminService({ now: () => now }),
    advance: (ms) => {
      now += ms;
    },
  };
}

function coreHarness(): Harness {
  let now = START;
  const core = createFakeCore({ now: () => now });
  return {
    service: new CoreAdminService({
      url: "https://kitamo-test.supabase.co",
      anonKey: "anon",
      accessToken: "admin-token",
      fetchImpl: fakeCoreFetch(core, (token) =>
        token === "admin-token"
          ? {
              sub: "0a000000-0000-4000-8000-00000000000a",
              aal: "aal2",
              admin: true,
            }
          : null,
      ),
    }),
    advance: (ms) => {
      now += ms;
    },
  };
}

function data<T>(result: ServiceResult<T>): T {
  if (!result.ok)
    throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

function code<T>(result: ServiceResult<T>): string {
  return result.ok ? "OK" : result.error.code;
}

const open = (
  service: AdminService,
  over: Partial<Parameters<AdminService["openAccess"]>[0]> = {},
) =>
  service.openAccess({
    businessId: BIZ,
    level: "summary",
    reasonCode: "support_request",
    reasonText: REASON,
    flagId: null,
    reference: null,
    withholdCode: null,
    withholdDays: null,
    clientRequestId: crypto.randomUUID(),
    ...over,
  });

for (const [name, make] of [
  ["mock", mockHarness],
  ["Core", coreHarness],
] as const) {
  describe(`R16 contract: the ${name} adapter`, () => {
    it("serves the directory with no reason, counts only", async () => {
      const { service } = make();
      const page = data(await service.listDirectory({ limit: 5 }));
      expect(page.rows).toHaveLength(5);
      expect(page.next).not.toBeNull();
      const keys = Object.keys(page.rows[0] ?? {}).sort();
      expect(keys).toEqual([
        "appsOn",
        "businessId",
        "createdOn",
        "hidden",
        "lastSaleDay",
        "name",
        "openFlags",
        "sales7d",
        "staffCount",
        "stallCount",
      ]);
      expect(JSON.stringify(page)).not.toMatch(
        /cents|amount|total_|balance|cost|price|email/i,
      );
      const next = data(
        await service.listDirectory({
          limit: 5,
          after: page.next ?? undefined,
        }),
      );
      expect(next.rows[0]?.businessId).not.toBe(page.rows[0]?.businessId);
      expect(data(await service.getOverview()).totals.businesses).toBe(12);
    });

    it("refuses a summary without an access, then serves it with one", async () => {
      const { service } = make();
      expect(code(await service.getBusinessSummary(BIZ))).toBe("FORBIDDEN");
      const access = data(await open(service));
      expect(Date.parse(access.expiresAt) - Date.parse(access.openedAt)).toBe(
        30 * 60_000,
      );
      const summary = data(await service.getBusinessSummary(BIZ));
      expect(summary.days).toHaveLength(14);
      expect(code(await service.getBusinessSummary(OTHER))).toBe("FORBIDDEN");
      // Records are never inherited from a summary access.
      expect(
        code(
          await service.getBusinessRecords({
            businessId: BIZ,
            kind: "staff",
            from: null,
            to: null,
          }),
        ),
      ).toBe("FORBIDDEN");
      const session = data(await service.getSession());
      expect(session.accesses.map((entry) => entry.accessId)).toEqual([
        access.accessId,
      ]);
    });

    it("opens records only with evidence, then serves each kind", async () => {
      const { service } = make();
      expect(code(await open(service, { level: "records" }))).toBe(
        "VALIDATION_ERROR",
      );
      data(
        await open(service, { level: "records", reference: "SUP-2026-0142" }),
      );
      const sales = data(
        await service.getBusinessRecords({
          businessId: BIZ,
          kind: "sales",
          from: "2026-10-08",
          to: "2026-10-14",
        }),
      );
      expect(sales.kind).toBe("sales");
      for (const kind of ["credit", "staff"] as const) {
        expect(
          data(
            await service.getBusinessRecords({
              businessId: BIZ,
              kind,
              from: null,
              to: null,
            }),
          ).kind,
        ).toBe(kind);
      }
      // More than 31 days never leaves the site.
      expect(
        code(
          await service.getBusinessRecords({
            businessId: BIZ,
            kind: "audit",
            from: "2026-09-01",
            to: "2026-10-14",
          }),
        ),
      ).toBe("VALIDATION_ERROR");
    });

    it("refuses another business's flag or a dismissed one, as KM005", async () => {
      const { service } = make();
      const flags = data(await service.listFlags({ status: null }));
      const own = flags.find((flag) => flag.businessId === BIZ);
      expect(own).toBeDefined();
      expect(
        code(
          await open(service, {
            businessId: OTHER,
            level: "records",
            flagId: own?.flagId ?? null,
          }),
        ),
      ).toBe("FORBIDDEN");
      const dismissed = data(
        await service.listFlags({ status: "dismissed" }),
      )[0];
      expect(
        code(
          await open(service, {
            businessId: dismissed?.businessId ?? OTHER,
            level: "records",
            flagId: dismissed?.flagId ?? null,
          }),
        ),
      ).toBe("FORBIDDEN");
      expect(
        code(
          await open(service, {
            level: "records",
            reasonCode: "flag_review",
            flagId: own?.flagId ?? null,
          }),
        ),
      ).toBe("OK");
    });

    it("allows three live accesses, not four (KM003 too_many)", async () => {
      const { service } = make();
      for (const businessId of MOCK_R16_BUSINESS_IDS.slice(0, 3)) {
        data(await open(service, { businessId }));
      }
      const fourth = await open(service, {
        businessId: MOCK_R16_BUSINESS_IDS[3],
      });
      expect(fourth.ok).toBe(false);
      if (!fourth.ok) {
        expect(fourth.error.code).toBe("VALIDATION_ERROR");
        expect(fourth.error.details?.reason).toBe("too_many");
      }
    });

    it("is idempotent by request id, and KM015 on changed details", async () => {
      const { service } = make();
      const clientRequestId = crypto.randomUUID();
      const first = data(await open(service, { clientRequestId }));
      const replay = data(await open(service, { clientRequestId }));
      expect(replay.accessId).toBe(first.accessId);
      expect(
        code(await open(service, { clientRequestId, businessId: OTHER })),
      ).toBe("CONFLICT");
    });

    it("ends access after 30 minutes, and on Close", async () => {
      const { service, advance } = make();
      const access = data(await open(service));
      advance(29 * 60_000);
      expect(code(await service.getBusinessSummary(BIZ))).toBe("OK");
      advance(60_000);
      expect(code(await service.getBusinessSummary(BIZ))).toBe("FORBIDDEN");
      expect(data(await service.getSession()).accesses).toEqual([]);
      expect(
        data(
          await service.closeAccess({
            accessId: access.accessId,
            clientRequestId: crypto.randomUUID(),
          }),
        ).state,
      ).toBe("expired");
      // The directory and the access log still answer.
      expect(code(await service.listDirectory())).toBe("OK");
      const log = data(await service.listAccessLog({ before: null }));
      expect(log.accesses[0]?.endedHow).toBe("expired");

      const second = data(await open(service));
      const closeId = crypto.randomUUID();
      const closed = data(
        await service.closeAccess({
          accessId: second.accessId,
          clientRequestId: closeId,
        }),
      );
      expect(closed.state).toBe("closed");
      expect(
        data(
          await service.closeAccess({
            accessId: second.accessId,
            clientRequestId: closeId,
          }),
        ).state,
      ).toBe("closed");
      expect(code(await service.getBusinessSummary(BIZ))).toBe("FORBIDDEN");
    });

    it("raises a flag from a live summary, and reviews it with a note", async () => {
      const { service } = make();
      const evidence = {
        counts: { stock_use_issues_7d: 4 },
        check: "stock_use",
      };
      const raise = (clientRequestId: string) =>
        service.raiseFlag({
          businessId: OTHER,
          kind: "health_mismatch",
          source: "health",
          evidence,
          clientRequestId,
        });
      expect(code(await raise(crypto.randomUUID()))).toBe("FORBIDDEN");
      data(await open(service, { businessId: OTHER }));
      const requestId = crypto.randomUUID();
      const flag = data(await raise(requestId));
      expect(flag.status).toBe("open");
      expect(data(await raise(requestId)).flagId).toBe(flag.flagId);
      const review = (
        status: "reviewing" | "dismissed" | "open",
        note: string | null,
      ) =>
        service.reviewFlag({
          flagId: flag.flagId,
          status,
          note,
          clientRequestId: crypto.randomUUID(),
        });
      expect(data(await review("reviewing", null)).status).toBe("reviewing");
      expect(code(await review("open", "Looked again carefully."))).toBe(
        "VALIDATION_ERROR",
      );
      expect(
        data(await review("dismissed", "Counts matched after the restock."))
          .status,
      ).toBe("dismissed");
      const listed = data(await service.listFlags({ status: "dismissed" }));
      expect(listed.some((entry) => entry.flagId === flag.flagId)).toBe(true);
    });

    it("logs reads and shows them in the access log", async () => {
      const { service } = make();
      data(await service.listDirectory({ limit: 3 }));
      const access = data(await open(service));
      data(await service.getBusinessSummary(BIZ));
      const log = data(await service.listAccessLog({ before: null }));
      expect(log.accesses[0]?.accessId).toBe(access.accessId);
      expect(log.accesses[0]?.reasonText).toBe(REASON);
      expect(log.accesses[0]?.reads).toBe(1);
      const fns = log.reads.map((read) => read.fn);
      expect(fns).toContain("km_admin_directory");
      expect(fns).toContain("km_admin_business_summary");
    });

    it("answers NOT_AVAILABLE for associations until the HOA level", async () => {
      const { service } = make();
      expect(code(await service.listAssociations())).toBe("NOT_AVAILABLE");
    });
  });
}

describe("R16 contract: Core's gate", () => {
  it("refuses aal1, a non-admin and the switch off with the same KM005", async () => {
    const core = createFakeCore();
    const service = (aal: string, admin: boolean) =>
      new CoreAdminService({
        url: "https://kitamo-test.supabase.co",
        anonKey: "anon",
        accessToken: "t",
        fetchImpl: fakeCoreFetch(core, () => ({
          sub: "0a000000-0000-4000-8000-00000000000b",
          aal,
          admin,
        })),
      });
    expect(code(await service("aal1", true).getSession())).toBe("FORBIDDEN");
    expect(code(await service("aal2", false).getSession())).toBe("FORBIDDEN");
    core.setSwitch(false);
    expect(code(await service("aal2", true).getSession())).toBe("FORBIDDEN");
    core.setSwitch(true);
    expect(code(await service("aal2", true).getSession())).toBe("OK");
  });
});
