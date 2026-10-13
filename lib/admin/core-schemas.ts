import { z } from "zod";

import {
  accessLevelSchema,
  auditSourceSchema,
  flagKindSchema,
  flagSourceSchema,
  flagStatusSchema,
  reasonCodeSchema,
  type AccessLog,
  type AdminSessionState,
  type Association,
  type BusinessSummary,
  type ClosedAccess,
  type DirectoryPage,
  type Flag,
  type FlagEvidence,
  type OpenedAccess,
  type RaisedFlag,
  type RecordsPage,
  type ReviewedFlag,
} from "./r16-schemas";

/**
 * Core's replies, key for key (sr-admin-0083-0084.md §3.2). Every object is
 * z.strictObject: a key Core adds that is not on the allowlist fails the
 * parse, so the adapter answers `unavailable` and nothing is rendered (fail
 * closed). Each parser then maps the reply into the domain contract
 * (r16-schemas.ts), normalising timestamps to UTC `Z`.
 */

const id = z.guid();
/** Core's jsonb timestamptz: ISO 8601 with an offset (or Z), any precision. */
const ts = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value).toISOString());
const day = z.iso.date();
const count = z.int().nonnegative();
const cents = z.int().min(-1_000_000_000_000).max(1_000_000_000_000);
const text = (max: number) => z.string().trim().min(1).max(max);

const sessionReply = z.strictObject({
  label: text(200),
  accesses: z
    .array(
      z.strictObject({
        access_id: id,
        business_id: id,
        business_name: text(200).nullable(),
        level: accessLevelSchema,
        reason_code: reasonCodeSchema,
        expires_at: ts,
      }),
    )
    .max(20),
});

export const parseSessionReply = (body: unknown): AdminSessionState => {
  const reply = sessionReply.parse(body);
  return {
    label: reply.label,
    accesses: reply.accesses.map((access) => ({
      accessId: access.access_id,
      businessId: access.business_id,
      businessName: access.business_name,
      level: access.level,
      reasonCode: access.reason_code,
      expiresAt: access.expires_at,
    })),
  };
};

const directoryReply = z.strictObject({
  totals: z.strictObject({
    businesses: count,
    live: count,
    hidden: count,
    active_7d: count,
    with_open_flags: count,
  }),
  rows: z
    .array(
      z.strictObject({
        business_id: id,
        name: text(200),
        created_on: day,
        last_sale_day: day.nullable(),
        sales_7d: count,
        stall_count: count,
        staff_count: count,
        apps_on: z.array(text(200)).max(50),
        open_flags: count,
        hidden: z.boolean(),
      }),
    )
    .max(100),
  next: id.nullable(),
});

export const parseDirectoryReply = (body: unknown): DirectoryPage => {
  const reply = directoryReply.parse(body);
  return {
    totals: {
      businesses: reply.totals.businesses,
      live: reply.totals.live,
      hidden: reply.totals.hidden,
      active7d: reply.totals.active_7d,
      withOpenFlags: reply.totals.with_open_flags,
    },
    rows: reply.rows.map((row) => ({
      businessId: row.business_id,
      name: row.name,
      createdOn: row.created_on,
      lastSaleDay: row.last_sale_day,
      sales7d: row.sales_7d,
      stallCount: row.stall_count,
      staffCount: row.staff_count,
      appsOn: row.apps_on,
      openFlags: row.open_flags,
      hidden: row.hidden,
    })),
    next: reply.next,
  };
};

const openReply = z.strictObject({
  access_id: id,
  business_id: id,
  level: accessLevelSchema,
  opened_at: ts,
  expires_at: ts,
  withheld_until: ts.nullable(),
});

export const parseOpenReply = (body: unknown): OpenedAccess => {
  const reply = openReply.parse(body);
  return {
    accessId: reply.access_id,
    businessId: reply.business_id,
    level: reply.level,
    openedAt: reply.opened_at,
    expiresAt: reply.expires_at,
    withheldUntil: reply.withheld_until,
  };
};

const closeReply = z.strictObject({
  access_id: id,
  state: z.enum(["closed", "expired"]),
  ended_at: ts.nullable(),
});

export const parseCloseReply = (body: unknown): ClosedAccess => {
  const reply = closeReply.parse(body);
  return {
    accessId: reply.access_id,
    state: reply.state,
    endedAt: reply.ended_at,
  };
};

const summaryReply = z.strictObject({
  business: z.strictObject({
    business_id: id,
    name: text(200),
    created_on: day,
    timezone: text(64),
    hidden_since: ts.nullable(),
  }),
  stalls: z.array(z.strictObject({ stall_id: id, name: text(200) })).max(200),
  staff_count: count,
  days: z
    .array(
      z.strictObject({
        day,
        sales_count: count,
        sales_cents: cents,
        returns_count: count,
        returns_cents: cents,
      }),
    )
    .length(14),
  health: z.strictObject({
    stock_use_issues_7d: count,
    ticket_issues_7d: count,
    problem_reports_7d: count,
    staff_code_failures_1d: count,
    correction_requests_open: count,
  }),
  apps: z
    .array(z.strictObject({ grantee: text(200), scope: text(200), since: ts }))
    .max(100),
  settings: z.strictObject({
    ticket_mode: text(40),
    owner_pin_set: z.boolean(),
    payment_qr_count: count,
  }),
  flags: z
    .array(
      z.strictObject({
        flag_id: id,
        kind: flagKindSchema,
        source: flagSourceSchema,
        status: flagStatusSchema,
        created_at: ts,
      }),
    )
    .max(200),
});

export const parseSummaryReply = (body: unknown): BusinessSummary => {
  const reply = summaryReply.parse(body);
  return {
    business: {
      businessId: reply.business.business_id,
      name: reply.business.name,
      createdOn: reply.business.created_on,
      timezone: reply.business.timezone,
      hiddenSince: reply.business.hidden_since,
    },
    stalls: reply.stalls.map((stall) => ({
      stallId: stall.stall_id,
      name: stall.name,
    })),
    staffCount: reply.staff_count,
    days: reply.days.map((entry) => ({
      day: entry.day,
      salesCount: entry.sales_count,
      salesCents: entry.sales_cents,
      returnsCount: entry.returns_count,
      returnsCents: entry.returns_cents,
    })),
    health: {
      stockUseIssues7d: reply.health.stock_use_issues_7d,
      ticketIssues7d: reply.health.ticket_issues_7d,
      problemReports7d: reply.health.problem_reports_7d,
      staffCodeFailures1d: reply.health.staff_code_failures_1d,
      correctionRequestsOpen: reply.health.correction_requests_open,
    },
    apps: reply.apps.map((app) => ({
      grantee: app.grantee,
      scope: app.scope,
      since: app.since,
    })),
    settings: {
      ticketMode: reply.settings.ticket_mode,
      ownerPinSet: reply.settings.owner_pin_set,
      paymentQrCount: reply.settings.payment_qr_count,
    },
    flags: reply.flags.map((flag) => ({
      flagId: flag.flag_id,
      kind: flag.kind,
      source: flag.source,
      status: flag.status,
      createdAt: flag.created_at,
    })),
  };
};

/** A sale's number: Core may send it as text or as an integer. */
const transactionNo = z
  .union([text(60), z.int().nonnegative()])
  .nullable()
  .transform((value) => (value === null ? null : String(value)));

const saleRow = z.strictObject({
  sale_id: id,
  happened_at: ts,
  stall_id: id.nullable(),
  transaction_no: transactionNo,
  amount_cents: cents,
  discount_cents: cents,
  payment_method: text(40),
  voided_at: ts.nullable(),
  return_kind: text(40).nullable(),
  return_cents: cents.nullable(),
  customer_id: id.nullable(),
  customer_name: text(200).nullable(),
  line_count: count,
  recorded_by_label: text(200).nullable(),
});

const creditRow = z.strictObject({
  customer_id: id,
  name: text(200),
  balance_cents: cents,
  oldest_unpaid_on: day.nullable(),
  last_payment_at: ts.nullable(),
});

const staffRow = z.strictObject({
  staff_member_id: id,
  label: text(200),
  stall_ids: z.array(id).max(200),
  powers: z.array(text(40)).max(40),
  created_at: ts,
  ended_at: ts.nullable(),
  last_session_at: ts.nullable(),
});

const auditRow = z.strictObject({
  source: auditSourceSchema,
  kind: text(60),
  at: ts,
  actor_label: text(200).nullable(),
  subject_id: id.nullable(),
});

const recordsWindow = {
  from: day.nullable(),
  to: day.nullable(),
  more: z.boolean(),
};

const recordsReply = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("sales"),
    ...recordsWindow,
    rows: z.array(saleRow).max(200),
  }),
  z.strictObject({
    kind: z.literal("credit"),
    ...recordsWindow,
    rows: z.array(creditRow).max(200),
  }),
  z.strictObject({
    kind: z.literal("staff"),
    ...recordsWindow,
    rows: z.array(staffRow).max(100),
  }),
  z.strictObject({
    kind: z.literal("audit"),
    ...recordsWindow,
    rows: z.array(auditRow).max(200),
  }),
]);

export const parseRecordsReply = (body: unknown): RecordsPage => {
  const reply = recordsReply.parse(body);
  const window = { from: reply.from, to: reply.to, more: reply.more };
  switch (reply.kind) {
    case "sales":
      return {
        kind: "sales",
        ...window,
        rows: reply.rows.map((row) => ({
          saleId: row.sale_id,
          happenedAt: row.happened_at,
          stallId: row.stall_id,
          transactionNo: row.transaction_no,
          amountCents: row.amount_cents,
          discountCents: row.discount_cents,
          paymentMethod: row.payment_method,
          voidedAt: row.voided_at,
          returnKind: row.return_kind,
          returnCents: row.return_cents,
          customerId: row.customer_id,
          customerName: row.customer_name,
          lineCount: row.line_count,
          recordedByLabel: row.recorded_by_label,
        })),
      };
    case "credit":
      return {
        kind: "credit",
        ...window,
        rows: reply.rows.map((row) => ({
          customerId: row.customer_id,
          name: row.name,
          balanceCents: row.balance_cents,
          oldestUnpaidOn: row.oldest_unpaid_on,
          lastPaymentAt: row.last_payment_at,
        })),
      };
    case "staff":
      return {
        kind: "staff",
        ...window,
        rows: reply.rows.map((row) => ({
          staffMemberId: row.staff_member_id,
          label: row.label,
          stallIds: row.stall_ids,
          powers: row.powers,
          createdAt: row.created_at,
          endedAt: row.ended_at,
          lastSessionAt: row.last_session_at,
        })),
      };
    case "audit":
      return {
        kind: "audit",
        ...window,
        rows: reply.rows.map((row) => ({
          source: row.source,
          kind: row.kind,
          at: row.at,
          actorLabel: row.actor_label,
          subjectId: row.subject_id,
        })),
      };
  }
};

/** Evidence as Core stores it (an object; `{}` after a purge's forget). */
const evidence = z.strictObject({
  counts: z
    .record(
      z
        .string()
        .regex(/^[a-z0-9_]{1,40}$/)
        .refine((key) => !/cents|amount|peso|total|balance|cost/.test(key)),
      z.int().min(0).max(1_000_000_000),
    )
    .refine((counts) => Object.keys(counts).length <= 20)
    .optional(),
  record_ids: z.array(id).max(50).optional(),
  check: z
    .string()
    .regex(/^[a-z0-9_]{1,40}$/)
    .optional(),
});

const flagsReply = z
  .array(
    z.strictObject({
      flag_id: id,
      business_id: id,
      business_name: text(200).nullable(),
      kind: flagKindSchema,
      source: flagSourceSchema,
      status: flagStatusSchema,
      evidence,
      created_at: ts,
      closed_at: ts.nullable(),
    }),
  )
  .max(200);

export const parseFlagsReply = (body: unknown): Flag[] =>
  flagsReply.parse(body).map((flag) => {
    const parsedEvidence: FlagEvidence = {};
    if (flag.evidence.counts !== undefined)
      parsedEvidence.counts = flag.evidence.counts;
    if (flag.evidence.record_ids !== undefined)
      parsedEvidence.record_ids = flag.evidence.record_ids;
    if (flag.evidence.check !== undefined)
      parsedEvidence.check = flag.evidence.check;
    return {
      flagId: flag.flag_id,
      businessId: flag.business_id,
      businessName: flag.business_name,
      kind: flag.kind,
      source: flag.source,
      status: flag.status,
      evidence: parsedEvidence,
      createdAt: flag.created_at,
      closedAt: flag.closed_at,
    };
  });

const raiseReply = z.strictObject({ flag_id: id, status: z.literal("open") });

export const parseRaiseReply = (body: unknown): RaisedFlag => {
  const reply = raiseReply.parse(body);
  return { flagId: reply.flag_id, status: reply.status };
};

const reviewReply = z.strictObject({ flag_id: id, status: flagStatusSchema });

export const parseReviewReply = (body: unknown): ReviewedFlag => {
  const reply = reviewReply.parse(body);
  return { flagId: reply.flag_id, status: reply.status };
};

const accessLogReply = z.strictObject({
  accesses: z
    .array(
      z.strictObject({
        access_id: id,
        admin_label: text(200),
        business_id: id,
        business_name: text(200).nullable(),
        level: accessLevelSchema,
        reason_code: reasonCodeSchema,
        reason_text: text(500).nullable(),
        flag_id: id.nullable(),
        reference: z.string().min(1).max(60).nullable(),
        opened_at: ts,
        expires_at: ts,
        ended_at: ts.nullable(),
        ended_how: z.enum(["closed", "expired", "open"]),
        withheld_until: ts.nullable(),
        reads: count,
      }),
    )
    .max(100),
  reads: z
    .array(
      z.strictObject({
        fn: z.string().regex(/^km_admin_[a-z_]{1,40}$/),
        business_id: id.nullable(),
        access_id: id.nullable(),
        rows_returned: count.nullable(),
        at: ts,
      }),
    )
    .max(200),
});

export const parseAccessLogReply = (body: unknown): AccessLog => {
  const reply = accessLogReply.parse(body);
  return {
    accesses: reply.accesses.map((entry) => ({
      accessId: entry.access_id,
      adminLabel: entry.admin_label,
      businessId: entry.business_id,
      businessName: entry.business_name,
      level: entry.level,
      reasonCode: entry.reason_code,
      reasonText: entry.reason_text,
      flagId: entry.flag_id,
      reference: entry.reference,
      openedAt: entry.opened_at,
      expiresAt: entry.expires_at,
      endedAt: entry.ended_at,
      endedHow: entry.ended_how,
      withheldUntil: entry.withheld_until,
      reads: entry.reads,
    })),
    reads: reply.reads.map((read) => ({
      fn: read.fn,
      businessId: read.business_id,
      accessId: read.access_id,
      rowsReturned: read.rows_returned,
      at: read.at,
    })),
  };
};

/** 0086 (the JR's) defines this; until then PostgREST answers PGRST202. */
const associationsReply = z
  .array(
    z.strictObject({
      association_id: id,
      name: text(200),
      status: text(40),
      member_stall_count: count,
      officer_count: count,
      code_rotated_at: ts.nullable(),
    }),
  )
  .max(500);

export const parseAssociationsReply = (body: unknown): Association[] =>
  associationsReply.parse(body).map((row) => ({
    associationId: row.association_id,
    name: row.name,
    status: row.status,
    memberStallCount: row.member_stall_count,
    officerCount: row.officer_count,
    codeRotatedAt: row.code_rotated_at,
  }));

/** PostgREST's error body. Read loosely: it is never rendered. */
export const postgrestErrorSchema = z.object({
  code: z.string().max(20).optional(),
  message: z.string().max(2_000).optional(),
  details: z.string().max(2_000).nullable().optional(),
});

/** KM003's `detail.reason` (the 0068:299 style: a JSON text in `details`). */
export function km003Reason(details: string | null | undefined): string | null {
  if (typeof details !== "string") return null;
  try {
    const value: unknown = JSON.parse(details);
    if (
      value !== null &&
      typeof value === "object" &&
      typeof (value as { reason?: unknown }).reason === "string"
    ) {
      const reason = (value as { reason: string }).reason;
      return /^[a-z_]{1,40}$/.test(reason) ? reason : null;
    }
  } catch {
    // Not a KM003 detail.
  }
  return null;
}
