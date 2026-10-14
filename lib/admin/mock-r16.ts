import { LETTER_REFERENCE_PATTERN, MAX_LIVE_ACCESSES } from "./r16-rules";
import type {
  AccessLevel,
  AccessLog,
  AddOfficerInput,
  Association,
  AssociationChanged,
  AssociationChangeInput,
  AssociationDetail,
  AssociationKind,
  CreateAssociationInput,
  CreatedAssociation,
  EndOfficerInput,
  AccessLogEntry,
  AccessRead,
  AdminSessionState,
  AuditRecord,
  BusinessSummary,
  CloseAccessInput,
  ClosedAccess,
  CreditRecord,
  DirectoryPage,
  DirectoryQuery,
  DirectoryRow,
  Flag,
  FlagEvidence,
  FlagKind,
  FlagSource,
  FlagStatus,
  FlagsQuery,
  OpenAccessInput,
  OpenedAccess,
  RaiseFlagInput,
  RaisedFlag,
  ReasonCode,
  RecordsPage,
  RecordsQuery,
  ReviewFlagInput,
  ReviewedFlag,
  SaleRecord,
  StaffRecord,
  WithholdCode,
} from "./r16-schemas";

/**
 * Fictional R16 data and the rules Core enforces (km_admin_can and the 0084
 * functions), so the mock and Core adapters answer the same contract tests
 * (ADM-021). Process-local, never durable, never a production export.
 * Refusals are thrown as R16Refusal and mapped by MockAdminService:
 * `forbidden` is KM005's one answer, `invalid` is KM003, `conflict` KM015.
 */

export class R16Refusal extends Error {
  readonly kind: "forbidden" | "invalid" | "conflict";
  readonly reason: string | null;

  constructor(
    kind: "forbidden" | "invalid" | "conflict",
    reason: string | null = null,
  ) {
    super(
      kind === "forbidden"
        ? "Not permitted."
        : kind === "conflict"
          ? "Request details changed."
          : "KitaMo refused the request as incomplete or invalid.",
    );
    this.name = "R16Refusal";
    this.kind = kind;
    this.reason = reason;
  }
}

const MINUTE = 60_000;
const DAY = 86_400_000;
const ADMIN_LABEL = "Owner (mock)";

type MockBusiness = {
  id: string;
  name: string;
  createdOn: string;
  hidden: boolean;
  stallIds: string[];
  stallNames: string[];
  staffCount: number;
  appsOn: string[];
  seed: number;
};

type MockAccess = {
  id: string;
  businessId: string;
  level: AccessLevel;
  reasonCode: ReasonCode;
  reasonText: string;
  flagId: string | null;
  reference: string | null;
  openedAt: number;
  expiresAt: number;
  closedAt: number | null;
  closeRequestId: string | null;
  withholdCode: WithholdCode | null;
  withheldUntil: number | null;
  clientRequestId: string;
};

type MockFlag = {
  id: string;
  businessId: string;
  kind: FlagKind;
  source: FlagSource;
  status: FlagStatus;
  evidence: FlagEvidence;
  createdAt: number;
  closedAt: number | null;
  clientRequestId: string;
};

type MockOfficer = {
  id: string;
  email: string;
  label: string;
  addedAt: number;
  acceptedAt: number | null;
  endedAt: number | null;
  clientRequestId: string;
  endRequestId: string | null;
};

type MockAssociation = {
  id: string;
  name: string;
  kind: AssociationKind;
  area: string | null;
  letterReference: string;
  status: "live" | "closed";
  joinCode: string;
  codeRotatedAt: number | null;
  createdAt: number;
  memberStallCount: number;
  officers: MockOfficer[];
  clientRequestId: string;
};

/** D18 §3: 8 of A-Z without I, L and O, plus 2-9. */
const JOIN_CODE_LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function newJoinCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(
    bytes,
    (byte) => JOIN_CODE_LETTERS[byte % JOIN_CODE_LETTERS.length],
  ).join("");
}

type MockRead = {
  fn: string;
  businessId: string | null;
  accessId: string | null;
  rowsReturned: number | null;
  at: number;
};

const NAMES = [
  "Bite Delight",
  "Tindahan ni Aling Rosa",
  "Kusina ni Mang Ben",
  "Sari-Sari Kiko",
  "Lutong Bahay Joy",
  "Kape at Pandesal Corner",
  "Inihaw Express",
  "Halo-Halo Haven",
  "Bigas at Iba Pa",
  "Turon Republic",
  "Silog Station",
  "Prutas ni Nena",
] as const;

const CUSTOMERS = [
  "Ate Liza",
  "Kuya Dodong",
  "Mang Tonyo",
  "Aling Bebang",
  "Jun-Jun",
  "Tita Marites",
] as const;

/** A deterministic, valid-looking UUID for fictional records. */
export function mockId(kind: number, n: number): string {
  const hex = (kind * 1_000_003 + n).toString(16).padStart(12, "0");
  return `${String(kind).padStart(8, "0")}-0000-4000-8000-${hex.slice(-12)}`;
}

export const MOCK_R16_BUSINESS_IDS = NAMES.map((_, index) =>
  mockId(11, index + 1),
);

function seeded(seed: number, n: number): number {
  // A small deterministic hash: the same business shows the same numbers.
  let x = (seed * 2_654_435_761 + n * 40_503) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 0x5bd1e995) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
}

function iso(ms: number | null): string | null {
  return ms === null ? null : new Date(ms).toISOString();
}

function isoDay(ms: number, timeZone = "Asia/Manila"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

export class MockR16Store {
  private readonly businesses: MockBusiness[];
  private readonly accesses: MockAccess[] = [];
  private readonly flags: MockFlag[];
  private readonly reads: MockRead[] = [];
  private readonly associationRows: MockAssociation[];
  /** Request ids of rotations and closes, with what each did (replays, KM015). */
  private readonly associationChanges = new Map<string, string>();
  private readonly now: () => number;

  constructor(now: () => number, empty = false) {
    this.now = now;
    const start = now();
    this.businesses = empty
      ? []
      : NAMES.map((name, index) => {
          const seed = index + 1;
          const stallCount = 1 + (seeded(seed, 1) % 3);
          return {
            id: MOCK_R16_BUSINESS_IDS[index] ?? mockId(11, seed),
            name,
            createdOn: isoDay(start - (40 + (seeded(seed, 2) % 300)) * DAY),
            hidden: index === NAMES.length - 1,
            stallIds: Array.from({ length: stallCount }, (_, s) =>
              mockId(12, seed * 10 + s),
            ),
            stallNames: Array.from({ length: stallCount }, (_, s) =>
              s === 0 ? "Main stall" : `Stall ${s + 1}`,
            ),
            staffCount: seeded(seed, 3) % 5,
            appsOn:
              index % 3 === 0
                ? ["insights", "operations"]
                : index % 3 === 1
                  ? ["insights"]
                  : [],
            seed,
          };
        });
    const first = this.businesses[0];
    const second = this.businesses[1];
    this.flags =
      first === undefined || second === undefined
        ? []
        : [
            {
              id: mockId(13, 1),
              businessId: first.id,
              kind: "health_mismatch",
              source: "health",
              status: "open",
              evidence: {
                counts: { stock_use_issues_7d: 4 },
                check: "stock_use",
              },
              createdAt: start - 2 * DAY,
              closedAt: null,
              clientRequestId: mockId(14, 1),
            },
            {
              id: mockId(13, 2),
              businessId: second.id,
              kind: "unusual_activity",
              source: "admin",
              status: "dismissed",
              evidence: { check: "late_voids" },
              createdAt: start - 9 * DAY,
              closedAt: start - 8 * DAY,
              clientRequestId: mockId(14, 2),
            },
          ];
    this.associationRows = empty
      ? []
      : [
          {
            id: mockId(18, 1),
            name: "Villa Rosa Homeowners",
            kind: "hoa",
            area: "Villa Rosa, Brgy. San Roque, Antipolo",
            letterReference: "VR-HOA-2026-014",
            status: "live",
            joinCode: "K7Q4X9RM",
            codeRotatedAt: start - 3 * DAY,
            createdAt: start - 20 * DAY,
            memberStallCount: 4,
            officers: [
              {
                id: mockId(19, 1),
                email: "juan.president@example.test",
                label: "Juan D., President",
                addedAt: start - 20 * DAY,
                acceptedAt: start - 19 * DAY,
                endedAt: null,
                clientRequestId: mockId(20, 1),
                endRequestId: null,
              },
              {
                id: mockId(19, 2),
                email: "maria.secretary@example.test",
                label: "Maria S., Secretary",
                addedAt: start - 2 * DAY,
                acceptedAt: null,
                endedAt: null,
                clientRequestId: mockId(20, 2),
                endRequestId: null,
              },
            ],
            clientRequestId: mockId(21, 1),
          },
          {
            id: mockId(18, 2),
            name: "Malanday Market Vendors",
            kind: "barangay",
            area: "Malanday public market",
            letterReference: "BRGY-MAL-0031",
            status: "live",
            joinCode: "P3RT8HWZ",
            codeRotatedAt: null,
            createdAt: start - 6 * DAY,
            memberStallCount: 2,
            officers: [
              {
                id: mockId(19, 3),
                email: "kap.ramon@example.test",
                label: "Kap. Ramon A.",
                addedAt: start - 6 * DAY,
                acceptedAt: start - 5 * DAY,
                endedAt: null,
                clientRequestId: mockId(20, 3),
                endRequestId: null,
              },
            ],
            clientRequestId: mockId(21, 2),
          },
        ];
  }

  // -- Readers -----------------------------------------------------------------

  session(): AdminSessionState {
    const now = this.now();
    return {
      label: ADMIN_LABEL,
      accesses: this.accesses
        .filter((access) => access.closedAt === null && access.expiresAt > now)
        .sort((a, b) => b.expiresAt - a.expiresAt)
        .map((access) => ({
          accessId: access.id,
          businessId: access.businessId,
          businessName: this.business(access.businessId)?.name ?? null,
          level: access.level,
          reasonCode: access.reasonCode,
          expiresAt: new Date(access.expiresAt).toISOString(),
        })),
    };
  }

  directory(query: DirectoryQuery): DirectoryPage {
    const limit = query.limit ?? 50;
    const search = query.search?.trim().toLocaleLowerCase("en") ?? "";
    const sorted = [...this.businesses].sort(
      (a, b) =>
        b.createdOn.localeCompare(a.createdOn) || a.id.localeCompare(b.id),
    );
    const matching = sorted.filter(
      (business) =>
        search === "" || business.name.toLocaleLowerCase("en").includes(search),
    );
    const startIndex =
      query.after === undefined
        ? 0
        : matching.findIndex((business) => business.id === query.after) + 1;
    const page = matching.slice(startIndex, startIndex + limit);
    const rows: DirectoryRow[] = page.map((business) =>
      this.directoryRow(business),
    );
    const next =
      startIndex + limit < matching.length
        ? (page[page.length - 1]?.id ?? null)
        : null;
    this.log("km_admin_directory", null, null, rows.length);
    return {
      totals: {
        businesses: this.businesses.length,
        live: this.businesses.filter((business) => !business.hidden).length,
        hidden: this.businesses.filter((business) => business.hidden).length,
        active7d: this.businesses.filter(
          (business) => this.directoryRow(business).sales7d > 0,
        ).length,
        withOpenFlags: new Set(
          this.flags
            .filter(
              (flag) => flag.status === "open" || flag.status === "reviewing",
            )
            .map((flag) => flag.businessId),
        ).size,
      },
      rows,
      next,
    };
  }

  summary(businessId: string): BusinessSummary {
    const access = this.gate("summary", businessId);
    const business = this.mustBusiness(businessId);
    const now = this.now();
    const days = Array.from({ length: 14 }, (_, offset) => {
      const n = 13 - offset;
      const salesCount = seeded(business.seed, 100 + n) % 40;
      const returnsCount = salesCount > 30 ? 1 : 0;
      return {
        day: isoDay(now - n * DAY),
        salesCount,
        salesCents:
          salesCount * (5_000 + (seeded(business.seed, 200 + n) % 9_000)),
        returnsCount,
        returnsCents: returnsCount * 4_500,
      };
    });
    const summary: BusinessSummary = {
      business: {
        businessId: business.id,
        name: business.name,
        createdOn: business.createdOn,
        timezone: "Asia/Manila",
        hiddenSince: business.hidden
          ? new Date(now - 20 * DAY).toISOString()
          : null,
      },
      stalls: business.stallIds.map((stallId, index) => ({
        stallId,
        name: business.stallNames[index] ?? "Stall",
      })),
      staffCount: business.staffCount,
      days,
      health: {
        stockUseIssues7d: business.seed === 1 ? 4 : 0,
        ticketIssues7d: seeded(business.seed, 5) % 2,
        problemReports7d: 0,
        staffCodeFailures1d: seeded(business.seed, 6) % 3,
        correctionRequestsOpen: seeded(business.seed, 7) % 2,
      },
      apps: business.appsOn.map((grantee, index) => ({
        grantee,
        scope: "use",
        since: new Date(now - (30 + index) * DAY).toISOString(),
      })),
      settings: {
        ticketMode: business.seed % 2 === 0 ? "tickets" : "off",
        ownerPinSet: business.seed % 4 !== 0,
        paymentQrCount: seeded(business.seed, 8) % 3,
      },
      flags: this.flags
        .filter((flag) => flag.businessId === businessId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((flag) => ({
          flagId: flag.id,
          kind: flag.kind,
          source: flag.source,
          status: flag.status,
          createdAt: new Date(flag.createdAt).toISOString(),
        })),
    };
    this.log("km_admin_business_summary", businessId, access.id, 1);
    return summary;
  }

  records(query: RecordsQuery): RecordsPage {
    const access = this.gate("records", query.businessId);
    const business = this.mustBusiness(query.businessId);
    const today = isoDay(this.now());
    if (
      (query.to !== null && query.to > today) ||
      (query.from !== null && query.from > today)
    ) {
      throw new R16Refusal("invalid", "window");
    }
    let page: RecordsPage;
    switch (query.kind) {
      case "sales": {
        const all = this.salesBetween(
          business,
          query.from ?? today,
          query.to ?? today,
        );
        page = {
          kind: "sales",
          from: query.from,
          to: query.to,
          more: all.length > 200,
          rows: all.slice(0, 200),
        };
        break;
      }
      case "credit": {
        const rows: CreditRecord[] = CUSTOMERS.slice(
          0,
          2 + (business.seed % 4),
        ).map((name, index) => ({
          customerId: mockId(15, business.seed * 10 + index),
          name,
          balanceCents: 1_000 * (1 + (seeded(business.seed, 300 + index) % 50)),
          oldestUnpaidOn: isoDay(this.now() - (3 + index * 4) * DAY),
          lastPaymentAt:
            index % 2 === 0
              ? new Date(this.now() - (1 + index) * DAY).toISOString()
              : null,
        }));
        page = { kind: "credit", from: null, to: null, more: false, rows };
        break;
      }
      case "staff": {
        const rows: StaffRecord[] = Array.from(
          { length: business.staffCount },
          (_, index) => ({
            staffMemberId: mockId(16, business.seed * 10 + index),
            label:
              ["Joy", "Kiko", "Ben", "Rosa", "Nena"][index] ??
              `Staff ${index + 1}`,
            stallIds: business.stallIds.slice(
              0,
              1 + (index % business.stallIds.length),
            ),
            powers: index === 0 ? ["sell", "stock"] : ["sell"],
            createdAt: new Date(this.now() - (60 + index) * DAY).toISOString(),
            endedAt: null,
            lastSessionAt: new Date(
              this.now() - (index + 1) * 3_600_000,
            ).toISOString(),
          }),
        );
        page = { kind: "staff", from: null, to: null, more: false, rows };
        break;
      }
      case "audit": {
        const all = this.auditBetween(
          business,
          query.from ?? today,
          query.to ?? today,
        );
        page = {
          kind: "audit",
          from: query.from,
          to: query.to,
          more: all.length > 200,
          rows: all.slice(0, 200),
        };
        break;
      }
    }
    this.log(
      "km_admin_business_records",
      business.id,
      access.id,
      page.rows.length,
    );
    return page;
  }

  flagList(query: FlagsQuery): Flag[] {
    const rows = this.flags
      .filter((flag) =>
        query.status === null
          ? flag.status === "open" || flag.status === "reviewing"
          : flag.status === query.status,
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 200)
      .map((flag) => ({
        flagId: flag.id,
        businessId: flag.businessId,
        businessName: this.business(flag.businessId)?.name ?? null,
        kind: flag.kind,
        source: flag.source,
        status: flag.status,
        evidence: flag.evidence,
        createdAt: new Date(flag.createdAt).toISOString(),
        closedAt:
          flag.closedAt === null ? null : new Date(flag.closedAt).toISOString(),
      }));
    this.log("km_admin_flags", null, null, rows.length);
    return rows;
  }

  accessLog(before: string | null): AccessLog {
    const limit =
      before === null ? Number.POSITIVE_INFINITY : Date.parse(before);
    const now = this.now();
    const accesses: AccessLogEntry[] = this.accesses
      .filter((access) => access.openedAt < limit)
      .sort((a, b) => b.openedAt - a.openedAt)
      .slice(0, 100)
      .map((access) => {
        const endedHow =
          access.closedAt !== null
            ? "closed"
            : access.expiresAt <= now
              ? "expired"
              : "open";
        return {
          accessId: access.id,
          adminLabel: ADMIN_LABEL,
          businessId: access.businessId,
          businessName: this.business(access.businessId)?.name ?? null,
          level: access.level,
          reasonCode: access.reasonCode,
          reasonText: access.reasonText,
          flagId: access.flagId,
          reference: access.reference,
          openedAt: new Date(access.openedAt).toISOString(),
          expiresAt: new Date(access.expiresAt).toISOString(),
          endedAt:
            endedHow === "closed"
              ? new Date(access.closedAt ?? now).toISOString()
              : endedHow === "expired"
                ? new Date(access.expiresAt).toISOString()
                : null,
          endedHow,
          withheldUntil:
            access.withheldUntil === null
              ? null
              : new Date(access.withheldUntil).toISOString(),
          reads: this.reads.filter((read) => read.accessId === access.id)
            .length,
        };
      });
    const reads: AccessRead[] = [...this.reads]
      .filter((read) => read.at < limit)
      .sort((a, b) => b.at - a.at)
      .slice(0, 200)
      .map((read) => ({
        fn: read.fn,
        businessId: read.businessId,
        accessId: read.accessId,
        rowsReturned: read.rowsReturned,
        at: new Date(read.at).toISOString(),
      }));
    this.log("km_admin_access_log", null, null, accesses.length);
    return { accesses, reads };
  }

  // -- Writers (Core's admin log only) ---------------------------------------

  open(input: OpenAccessInput): OpenedAccess {
    const replay = this.accesses.find(
      (access) => access.clientRequestId === input.clientRequestId,
    );
    if (replay !== undefined) {
      if (
        replay.businessId !== input.businessId ||
        replay.level !== input.level ||
        replay.reasonCode !== input.reasonCode ||
        replay.reasonText !== input.reasonText.trim() ||
        replay.flagId !== input.flagId ||
        replay.reference !== input.reference
      ) {
        throw new R16Refusal("conflict");
      }
      return this.opened(replay);
    }
    if (this.business(input.businessId) === undefined) {
      throw new R16Refusal("forbidden");
    }
    if (input.flagId !== null) {
      const flag = this.flags.find(
        (candidate) => candidate.id === input.flagId,
      );
      if (
        flag === undefined ||
        flag.businessId !== input.businessId ||
        (flag.status !== "open" && flag.status !== "reviewing")
      ) {
        throw new R16Refusal("forbidden");
      }
    }
    const now = this.now();
    const live = this.accesses.filter(
      (access) => access.closedAt === null && access.expiresAt > now,
    );
    if (live.length >= MAX_LIVE_ACCESSES) {
      throw new R16Refusal("invalid", "too_many");
    }
    const access: MockAccess = {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      level: input.level,
      reasonCode: input.reasonCode,
      reasonText: input.reasonText.trim(),
      flagId: input.flagId,
      reference: input.reference,
      openedAt: now,
      expiresAt: now + 30 * MINUTE,
      closedAt: null,
      closeRequestId: null,
      withholdCode: input.withholdCode,
      withheldUntil:
        input.withholdDays === null ? null : now + input.withholdDays * DAY,
      clientRequestId: input.clientRequestId,
    };
    this.accesses.push(access);
    return this.opened(access);
  }

  close(input: CloseAccessInput): ClosedAccess {
    const byRequest = this.accesses.find(
      (access) => access.closeRequestId === input.clientRequestId,
    );
    if (byRequest !== undefined && byRequest.id !== input.accessId) {
      throw new R16Refusal("conflict");
    }
    const access = this.accesses.find(
      (candidate) => candidate.id === input.accessId,
    );
    if (access === undefined) throw new R16Refusal("forbidden");
    if (access.closedAt !== null) {
      return {
        accessId: access.id,
        state: "closed",
        endedAt: new Date(access.closedAt).toISOString(),
      };
    }
    const now = this.now();
    if (access.expiresAt <= now) {
      return {
        accessId: access.id,
        state: "expired",
        endedAt: new Date(access.expiresAt).toISOString(),
      };
    }
    access.closedAt = now;
    access.closeRequestId = input.clientRequestId;
    return {
      accessId: access.id,
      state: "closed",
      endedAt: new Date(now).toISOString(),
    };
  }

  raise(input: RaiseFlagInput): RaisedFlag {
    const replay = this.flags.find(
      (flag) => flag.clientRequestId === input.clientRequestId,
    );
    if (replay !== undefined) {
      if (
        replay.businessId !== input.businessId ||
        replay.kind !== input.kind ||
        replay.source !== input.source
      ) {
        throw new R16Refusal("conflict");
      }
      return { flagId: replay.id, status: "open" };
    }
    this.gate("summary", input.businessId);
    const flag: MockFlag = {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      kind: input.kind,
      source: input.source,
      status: "open",
      evidence: input.evidence,
      createdAt: this.now(),
      closedAt: null,
      clientRequestId: input.clientRequestId,
    };
    this.flags.push(flag);
    return { flagId: flag.id, status: "open" };
  }

  review(
    input: ReviewFlagInput,
    allowed: Record<FlagStatus, readonly FlagStatus[]>,
  ): ReviewedFlag {
    const flag = this.flags.find((candidate) => candidate.id === input.flagId);
    if (flag === undefined) throw new R16Refusal("forbidden");
    if (flag.status === input.status) {
      return { flagId: flag.id, status: flag.status };
    }
    if (!allowed[flag.status].includes(input.status)) {
      throw new R16Refusal("invalid", "transition");
    }
    if (input.status !== "reviewing" && input.note === null) {
      throw new R16Refusal("invalid", "note");
    }
    flag.status = input.status;
    flag.closedAt =
      input.status === "dismissed" || input.status === "confirmed"
        ? this.now()
        : null;
    return { flagId: flag.id, status: flag.status };
  }

  // -- Associations (the HOA level, 0086, D18) -----------------------------------
  // The rules Core's 0086 is expected to enforce, as far as the site meets
  // them: an unknown association or officer is the one KM005; a closed
  // association takes no change (KM003 closed); an officer is a KitaMo
  // account (here: any email not starting "unknown") added once (KM003
  // officer); every write replays by its request id (KM015 on other details).

  associationList(): Association[] {
    const rows = [...this.associationRows]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((association) => ({
        associationId: association.id,
        name: association.name,
        kind: association.kind,
        status: association.status,
        memberStallCount: association.memberStallCount,
        officerCount: association.officers.filter(
          (officer) => officer.endedAt === null,
        ).length,
        codeRotatedAt: iso(association.codeRotatedAt),
      }));
    this.log("km_admin_associations", null, null, rows.length);
    return rows;
  }

  association(associationId: string): AssociationDetail {
    const association = this.mustAssociation(associationId);
    this.log("km_admin_association", null, null, 1);
    return {
      associationId: association.id,
      name: association.name,
      kind: association.kind,
      status: association.status,
      area: association.area,
      joinCode: association.joinCode,
      codeRotatedAt: iso(association.codeRotatedAt),
      officers: association.officers.map((officer) => ({
        officerId: officer.id,
        label: officer.label,
        addedAt: new Date(officer.addedAt).toISOString(),
        acceptedAt: iso(officer.acceptedAt),
        endedAt: iso(officer.endedAt),
      })),
    };
  }

  createAssociation(input: CreateAssociationInput): CreatedAssociation {
    if (!LETTER_REFERENCE_PATTERN.test(input.letterReference.trim())) {
      throw new R16Refusal("invalid", "letter_reference");
    }
    const replay = this.associationRows.find(
      (row) => row.clientRequestId === input.clientRequestId,
    );
    if (replay !== undefined) {
      if (
        replay.name !== input.name.trim() ||
        replay.kind !== input.kind ||
        replay.area !== input.area ||
        replay.letterReference !== input.letterReference.trim()
      ) {
        throw new R16Refusal("conflict");
      }
      return { associationId: replay.id, joinCode: replay.joinCode };
    }
    const association: MockAssociation = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      kind: input.kind,
      area: input.area,
      letterReference: input.letterReference.trim(),
      status: "live",
      joinCode: newJoinCode(),
      codeRotatedAt: null,
      createdAt: this.now(),
      memberStallCount: 0,
      officers: [],
      clientRequestId: input.clientRequestId,
    };
    this.associationRows.push(association);
    return { associationId: association.id, joinCode: association.joinCode };
  }

  addOfficer(input: AddOfficerInput): AssociationChanged {
    const email = input.email.trim().toLowerCase();
    const replay = this.associationRows
      .flatMap((row) => row.officers.map((officer) => ({ row, officer })))
      .find(({ officer }) => officer.clientRequestId === input.clientRequestId);
    if (replay !== undefined) {
      if (
        replay.row.id !== input.associationId ||
        replay.officer.email !== email ||
        replay.officer.label !== input.label.trim()
      ) {
        throw new R16Refusal("conflict");
      }
      return { done: true };
    }
    const association = this.mustAssociation(input.associationId);
    if (association.status !== "live") {
      throw new R16Refusal("invalid", "closed");
    }
    if (
      email.startsWith("unknown") ||
      association.officers.some(
        (officer) => officer.email === email && officer.endedAt === null,
      )
    ) {
      throw new R16Refusal("invalid", "officer");
    }
    association.officers.push({
      id: crypto.randomUUID(),
      email,
      label: input.label.trim(),
      addedAt: this.now(),
      acceptedAt: null,
      endedAt: null,
      clientRequestId: input.clientRequestId,
      endRequestId: null,
    });
    return { done: true };
  }

  endOfficer(input: EndOfficerInput): AssociationChanged {
    const officer = this.associationRows
      .flatMap((row) => row.officers)
      .find((candidate) => candidate.id === input.officerId);
    if (officer === undefined) throw new R16Refusal("forbidden");
    const used = this.associationRows
      .flatMap((row) => row.officers)
      .find((candidate) => candidate.endRequestId === input.clientRequestId);
    if (used !== undefined && used.id !== officer.id) {
      throw new R16Refusal("conflict");
    }
    if (officer.endedAt === null) {
      officer.endedAt = this.now();
      officer.endRequestId = input.clientRequestId;
    }
    return { done: true };
  }

  rotateCode(input: AssociationChangeInput): AssociationChanged {
    const association = this.mustAssociation(input.associationId);
    if (this.replayedChange(input, "rotate")) return { done: true };
    if (association.status !== "live") {
      throw new R16Refusal("invalid", "closed");
    }
    let code = newJoinCode();
    while (code === association.joinCode) code = newJoinCode();
    association.joinCode = code;
    association.codeRotatedAt = this.now();
    this.associationChanges.set(
      input.clientRequestId,
      `rotate:${association.id}`,
    );
    return { done: true };
  }

  closeAssociation(input: AssociationChangeInput): AssociationChanged {
    const association = this.mustAssociation(input.associationId);
    if (this.replayedChange(input, "close")) return { done: true };
    association.status = "closed";
    association.memberStallCount = 0;
    this.associationChanges.set(
      input.clientRequestId,
      `close:${association.id}`,
    );
    return { done: true };
  }

  private mustAssociation(id: string): MockAssociation {
    const association = this.associationRows.find((row) => row.id === id);
    if (association === undefined) throw new R16Refusal("forbidden");
    return association;
  }

  /** True when this request id already did exactly this; KM015 when it did something else. */
  private replayedChange(
    input: AssociationChangeInput,
    action: "rotate" | "close",
  ): boolean {
    const done = this.associationChanges.get(input.clientRequestId);
    if (done === undefined) return false;
    if (done !== `${action}:${input.associationId}`) {
      throw new R16Refusal("conflict");
    }
    return true;
  }

  // -- Internals ----------------------------------------------------------------

  /** km_admin_can: a live access of the level (records covers summary). */
  private gate(level: AccessLevel, businessId: string): MockAccess {
    const now = this.now();
    const access = this.accesses
      .filter(
        (candidate) =>
          candidate.businessId === businessId &&
          candidate.closedAt === null &&
          candidate.expiresAt > now &&
          (candidate.level === "records" || level === "summary"),
      )
      .sort((a, b) => b.expiresAt - a.expiresAt)[0];
    if (access === undefined) throw new R16Refusal("forbidden");
    return access;
  }

  private opened(access: MockAccess): OpenedAccess {
    return {
      accessId: access.id,
      businessId: access.businessId,
      level: access.level,
      openedAt: new Date(access.openedAt).toISOString(),
      expiresAt: new Date(access.expiresAt).toISOString(),
      withheldUntil:
        access.withheldUntil === null
          ? null
          : new Date(access.withheldUntil).toISOString(),
    };
  }

  private business(id: string): MockBusiness | undefined {
    return this.businesses.find((business) => business.id === id);
  }

  private mustBusiness(id: string): MockBusiness {
    const business = this.business(id);
    if (business === undefined) throw new R16Refusal("forbidden");
    return business;
  }

  private directoryRow(business: MockBusiness): DirectoryRow {
    const sales7d = business.hidden ? 0 : 5 + (seeded(business.seed, 9) % 120);
    return {
      businessId: business.id,
      name: business.name,
      createdOn: business.createdOn,
      lastSaleDay: business.hidden
        ? null
        : isoDay(this.now() - (business.seed % 3) * DAY),
      sales7d,
      stallCount: business.stallIds.length,
      staffCount: business.staffCount,
      appsOn: business.appsOn,
      openFlags: this.flags.filter(
        (flag) =>
          flag.businessId === business.id &&
          (flag.status === "open" || flag.status === "reviewing"),
      ).length,
      hidden: business.hidden,
    };
  }

  private daysBetween(from: string, to: string): string[] {
    const days: string[] = [];
    for (
      let ms = Date.parse(`${to}T12:00:00Z`);
      ms >= Date.parse(`${from}T12:00:00Z`);
      ms -= DAY
    ) {
      days.push(new Date(ms).toISOString().slice(0, 10));
    }
    return days;
  }

  private salesBetween(
    business: MockBusiness,
    from: string,
    to: string,
  ): SaleRecord[] {
    return this.daysBetween(from, to).flatMap((day, dayIndex) => {
      const count = seeded(business.seed, Date.parse(day) / DAY) % 14;
      return Array.from({ length: count }, (_, index) => {
        const n = dayIndex * 100 + index;
        const customer =
          index % 4 === 0 ? CUSTOMERS[index % CUSTOMERS.length] : undefined;
        const amount = 2_000 + (seeded(business.seed, n) % 30_000);
        return {
          saleId: mockId(17, business.seed * 100_000 + n),
          happenedAt: new Date(
            Date.parse(`${day}T01:00:00Z`) + index * 37 * MINUTE,
          ).toISOString(),
          stallId: business.stallIds[index % business.stallIds.length] ?? null,
          transactionNo: String(1_000 + n),
          amountCents: amount,
          discountCents: index % 5 === 0 ? 500 : 0,
          paymentMethod: index % 3 === 0 ? "e_wallet" : "cash",
          voidedAt: null,
          returnKind: null,
          returnCents: null,
          customerId:
            customer === undefined
              ? null
              : mockId(15, business.seed * 10 + (index % 6)),
          customerName: customer ?? null,
          lineCount: 1 + (index % 4),
          recordedByLabel: index % 2 === 0 ? "Owner" : "Joy",
        };
      });
    });
  }

  private auditBetween(
    business: MockBusiness,
    from: string,
    to: string,
  ): AuditRecord[] {
    const sources = [
      "staff_events",
      "money_corrections",
      "owner_pin_events",
      "stock_transfers",
    ] as const;
    return this.daysBetween(from, to).flatMap((day, dayIndex) =>
      Array.from(
        { length: seeded(business.seed, 500 + dayIndex) % 4 },
        (_, index) => ({
          source:
            sources[(dayIndex + index) % sources.length] ?? "staff_events",
          kind: index % 2 === 0 ? "signed_in" : "changed",
          at: new Date(
            Date.parse(`${day}T02:00:00Z`) + index * 53 * MINUTE,
          ).toISOString(),
          actorLabel: index % 2 === 0 ? "Owner" : "Joy",
          subjectId: null,
        }),
      ),
    );
  }

  private log(
    fn: string,
    businessId: string | null,
    accessId: string | null,
    rows: number | null,
  ) {
    this.reads.push({
      fn,
      businessId,
      accessId,
      rowsReturned: rows,
      at: this.now(),
    });
  }
}
