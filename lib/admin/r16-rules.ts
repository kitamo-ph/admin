import {
  FORBIDDEN_EVIDENCE_KEY,
  accessLevelSchema,
  flagKindSchema,
  raisableFlagSourceSchema,
  reasonCodeSchema,
  withholdCodeSchema,
  type AccessLevel,
  type FlagEvidence,
  type FlagKind,
  type FlagStatus,
  type ReasonCode,
  type WithholdCode,
} from "./r16-schemas";

/**
 * The rules an administrator meets before Core is asked (spec §3.2, D27
 * §4.2, OQ16/OQ17). Core enforces the same rules again; these exist so the
 * site never sends a request it knows Core refuses, and so the reason sheet
 * can say what is missing. They are pure, shared by the sheet (browser), the
 * server actions and the mock adapter.
 */

export const REASON_TEXT_MIN = 20;
export const REASON_TEXT_MAX = 500;
export const REFERENCE_PATTERN = /^[A-Za-z0-9#:/._-]{4,60}$/;
export const WITHHOLD_DAYS_MAX = 90;
export const ACCESS_MINUTES = 30;
export const MAX_LIVE_ACCESSES = 3;
export const REVIEW_NOTE_MIN = 10;
export const REVIEW_NOTE_MAX = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const REASON_LABELS: Record<ReasonCode, string> = {
  support_request: "support request",
  flag_review: "flag review",
  health_check: "health check",
  legal_request: "legal request",
  data_fix: "data fix",
};

export const LEVEL_LABELS: Record<AccessLevel, string> = {
  summary: "Summary",
  records: "Records",
};

export const WITHHOLD_LABELS: Record<WithholdCode, string> = {
  legal_request: "Legal request",
  fraud_review: "Fraud review",
};

export type ReasonSheetField =
  "level" | "reasonCode" | "reasonText" | "evidence" | "reference" | "withhold";

export type ReasonSheetDraft = {
  level: string;
  reasonCode: string;
  reasonText: string;
  flagId: string;
  reference: string;
  withholdCode: string;
  withholdDays: string;
};

export type ReasonSheetValue = {
  level: AccessLevel;
  reasonCode: ReasonCode;
  reasonText: string;
  flagId: string | null;
  reference: string | null;
  withholdCode: WithholdCode | null;
  withholdDays: number | null;
};

export type RuleResult<T, F extends string> =
  { ok: true; value: T } | { ok: false; errors: Partial<Record<F, string>> };

/** The reason sheet: a level, a reason code, 20+ characters, and evidence for Records. */
export function checkReasonSheet(
  draft: ReasonSheetDraft,
): RuleResult<ReasonSheetValue, ReasonSheetField> {
  const errors: Partial<Record<ReasonSheetField, string>> = {};
  const level = accessLevelSchema.safeParse(draft.level);
  if (!level.success) errors.level = "Choose Summary or Records.";
  const reasonCode = reasonCodeSchema.safeParse(draft.reasonCode);
  if (!reasonCode.success) errors.reasonCode = "Choose a reason.";

  const reasonText = draft.reasonText.trim();
  if (reasonText.length < REASON_TEXT_MIN) {
    errors.reasonText = `Write the reason in at least ${REASON_TEXT_MIN} characters (${reasonText.length} so far).`;
  } else if (reasonText.length > REASON_TEXT_MAX) {
    errors.reasonText = `Keep the reason to ${REASON_TEXT_MAX} characters.`;
  }

  const flagId = draft.flagId.trim() === "" ? null : draft.flagId.trim();
  if (flagId !== null && !UUID.test(flagId)) {
    errors.evidence = "Pick a flag from the list.";
  }
  const reference =
    draft.reference.trim() === "" ? null : draft.reference.trim();
  if (reference !== null && !REFERENCE_PATTERN.test(reference)) {
    errors.reference =
      "A reference is 4 to 60 letters, digits or # : / . _ - (no spaces).";
  }
  if (
    level.success &&
    level.data === "records" &&
    flagId === null &&
    reference === null &&
    errors.reference === undefined
  ) {
    errors.evidence =
      "Records need an open flag of this business or a support or legal reference.";
  }
  if (
    reasonCode.success &&
    reasonCode.data === "flag_review" &&
    flagId === null &&
    errors.evidence === undefined
  ) {
    errors.evidence = "A flag review needs the flag.";
  }

  let withholdCode: WithholdCode | null = null;
  let withholdDays: number | null = null;
  const codeText = draft.withholdCode.trim();
  const daysText = draft.withholdDays.trim();
  if (codeText !== "" || daysText !== "") {
    const code = withholdCodeSchema.safeParse(codeText);
    const days = /^\d{1,3}$/.test(daysText) ? Number(daysText) : NaN;
    if (!code.success) {
      errors.withhold = "Choose why the disclosure is held.";
    } else if (
      !Number.isInteger(days) ||
      days < 1 ||
      days > WITHHOLD_DAYS_MAX
    ) {
      errors.withhold = `Hold the disclosure for 1 to ${WITHHOLD_DAYS_MAX} days.`;
    } else if (
      reasonCode.success &&
      reasonCode.data !== "legal_request" &&
      reasonCode.data !== "flag_review"
    ) {
      errors.withhold =
        "Only a legal request or a flag review may hold the disclosure.";
    } else {
      withholdCode = code.data;
      withholdDays = days;
    }
  }

  if (Object.keys(errors).length > 0 || !level.success || !reasonCode.success) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      level: level.data,
      reasonCode: reasonCode.data,
      reasonText,
      flagId,
      reference,
      withholdCode,
      withholdDays,
    },
  };
}

/** Minutes left on an access, rounded up; 0 once it has ended. */
export function minutesLeft(expiresAt: string, nowMs: number): number {
  const left = Date.parse(expiresAt) - nowMs;
  if (!Number.isFinite(left) || left <= 0) return 0;
  return Math.ceil(left / 60_000);
}

/** Flag review transitions (spec §3.2). */
export const FLAG_TRANSITIONS: Record<FlagStatus, readonly FlagStatus[]> = {
  open: ["reviewing", "dismissed", "confirmed"],
  reviewing: ["dismissed", "confirmed"],
  dismissed: ["open"],
  confirmed: ["open"],
};

export type ReviewField = "status" | "note";

export function checkFlagReview(
  from: FlagStatus,
  to: string,
  noteText: string,
): RuleResult<{ status: FlagStatus; note: string | null }, ReviewField> {
  const allowed = FLAG_TRANSITIONS[from];
  const status = allowed.find((candidate) => candidate === to);
  if (status === undefined) {
    return {
      ok: false,
      errors: { status: "That change is not allowed for this flag." },
    };
  }
  const note = noteText.trim();
  if (status === "reviewing" && note === "") {
    return { ok: true, value: { status, note: null } };
  }
  if (note.length < REVIEW_NOTE_MIN || note.length > REVIEW_NOTE_MAX) {
    return {
      ok: false,
      errors: {
        note: `Write a note of ${REVIEW_NOTE_MIN} to ${REVIEW_NOTE_MAX} characters.`,
      },
    };
  }
  return { ok: true, value: { status, note } };
}

export type RaiseField = "kind" | "source" | "check" | "evidence";

/**
 * Raising a flag by hand from the Summary (D27 §6): a kind, a source, an
 * optional check name, and optionally the Summary's health counts. Evidence
 * is counts and a check name only: never a name, text or money.
 */
export function checkRaiseFlag(input: {
  kind: string;
  source: string;
  check: string;
  counts: Record<string, number> | null;
}): RuleResult<
  { kind: FlagKind; source: "health" | "admin"; evidence: FlagEvidence },
  RaiseField
> {
  const errors: Partial<Record<RaiseField, string>> = {};
  const kind = flagKindSchema.safeParse(input.kind);
  if (!kind.success) errors.kind = "Choose what kind of flag this is.";
  const source = raisableFlagSourceSchema.safeParse(input.source);
  if (!source.success) errors.source = "Choose where this came from.";
  const check = input.check.trim();
  if (check !== "" && !/^[a-z0-9_]{1,40}$/.test(check)) {
    errors.check =
      "A check name is 1 to 40 lowercase letters, digits or underscores.";
  }
  const counts = input.counts;
  if (counts !== null) {
    const keys = Object.keys(counts);
    if (
      keys.length > 20 ||
      keys.some(
        (key) =>
          !/^[a-z0-9_]{1,40}$/.test(key) ||
          FORBIDDEN_EVIDENCE_KEY.test(key) ||
          !Number.isInteger(counts[key]) ||
          (counts[key] ?? -1) < 0 ||
          (counts[key] ?? 0) > 1_000_000_000,
      )
    ) {
      errors.evidence = "Evidence is at most 20 counts, never money.";
    }
  }
  if (Object.keys(errors).length > 0 || !kind.success || !source.success) {
    return { ok: false, errors };
  }
  const evidence: FlagEvidence = {};
  if (counts !== null && Object.keys(counts).length > 0)
    evidence.counts = counts;
  if (check !== "") evidence.check = check;
  return {
    ok: true,
    value: { kind: kind.data, source: source.data, evidence },
  };
}
