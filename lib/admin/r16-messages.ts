import type { ServiceError } from "./schemas";

/**
 * A write whose result is unknown: the request reached Core (or may have),
 * and the answer was lost. Never "nothing was changed" (the lead's review,
 * LOW 7): a close or an open may have gone through; every write replays by
 * its request id, so trying again never does it twice.
 */
export const UNCONFIRMED =
  "We couldn't confirm this. Check the list before trying again.";

/**
 * What the administrator reads when Core refuses (spec §3.2). KM005 is one
 * "Not permitted" for every case: Core never says why, so neither does this.
 */
export function refusalMessage(
  error: ServiceError,
  reasons: Record<string, string> = {},
): string {
  switch (error.code) {
    case "FORBIDDEN":
      return "Not permitted.";
    case "CONFLICT":
      return "This request was already used with other details. Reload the page and try again.";
    case "VALIDATION_ERROR":
      return invalidMessage(
        typeof error.details?.reason === "string" ? error.details.reason : null,
        reasons,
      );
    case "TIMEOUT":
      return UNCONFIRMED;
    case "SERVICE_UNAVAILABLE":
      // Core answered with an error (5xx): its transaction rolled back. A
      // reply in a shape this site does not accept, or a connection lost after
      // the request went out, may follow a write that went through.
      return error.details?.contract !== undefined ||
        error.details?.stage === "transport"
        ? UNCONFIRMED
        : "KitaMo could not answer right now. Nothing was opened or changed. Try again.";
    case "NOT_AVAILABLE":
      return "This part of KitaMo is not available yet.";
    default:
      return "The request could not be completed safely. Nothing was changed.";
  }
}

const INVALID: Record<string, string> = {
  level: "Choose Summary or Records.",
  reason_code: "Choose a reason.",
  reason_text: "Write the reason in 20 to 500 characters.",
  evidence:
    "Records need an open flag of this business or a support or legal reference; a flag review needs the flag.",
  withhold:
    "A hold is only for a legal request or a flag review, for 1 to 90 days.",
  too_many:
    "You already have 3 open accesses. Close one before opening another.",
  window: "Pick a window of at most 31 days, not in the future.",
  kind: "Pick Sales, Credit, Staff or Audit.",
  source: "Pick where the flag came from (health or admin).",
  transition: "That change is not allowed for this flag.",
  note: "Write a note of 10 to 500 characters.",
};

export function invalidMessage(
  reason: string | null,
  reasons: Record<string, string> = {},
): string {
  return (
    (reason === null ? undefined : (reasons[reason] ?? INVALID[reason])) ??
    "KitaMo refused the request as incomplete or invalid. Nothing was changed."
  );
}

/**
 * KM003 reasons from the association functions (0086). `kind` there is the
 * association's kind, not a kind of records; unknown reasons read as the
 * general refusal.
 */
export const ASSOCIATION_REASONS: Record<string, string> = {
  kind: "Choose HOA or Barangay.",
  officer:
    "That email cannot be an officer here: it has no KitaMo account, belongs to a staff sign-in or KitaMo's admin, or is already an officer of this association.",
  closed: "This association is closed. Nothing was changed.",
  name: "Write the association's name in 1 to 80 characters.",
  area: "Write the place in at most 120 characters.",
  letter_reference:
    "Write the reference of the letter you checked: 4 to 60 letters, digits, spaces or # : / . _ - (no commas).",
  label: "Write the officer's name and role in 1 to 60 characters.",
};
