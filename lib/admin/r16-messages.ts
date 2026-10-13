import type { ServiceError } from "./schemas";

/**
 * What the administrator reads when Core refuses (spec §3.2). KM005 is one
 * "Not permitted" for every case: Core never says why, so neither does this.
 */
export function refusalMessage(error: ServiceError): string {
  switch (error.code) {
    case "FORBIDDEN":
      return "Not permitted.";
    case "CONFLICT":
      return "This request was already used with other details. Reload the page and try again.";
    case "VALIDATION_ERROR":
      return invalidMessage(
        typeof error.details?.reason === "string" ? error.details.reason : null,
      );
    case "TIMEOUT":
    case "SERVICE_UNAVAILABLE":
      return "KitaMo could not answer right now. Nothing was opened or changed. Try again.";
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

export function invalidMessage(reason: string | null): string {
  return (
    (reason === null ? undefined : INVALID[reason]) ??
    "KitaMo refused the request as incomplete or invalid. Nothing was changed."
  );
}
