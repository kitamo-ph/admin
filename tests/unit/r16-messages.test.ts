import { describe, expect, it } from "vitest";

import {
  ASSOCIATION_REASONS,
  UNCONFIRMED,
  refusalMessage,
} from "@/lib/admin/r16-messages";
import type { ServiceError } from "@/lib/admin/schemas";

const error = (
  code: ServiceError["code"],
  details?: Record<string, unknown>,
): ServiceError => ({
  code,
  message: "x",
  retryable: true,
  correlationId: "core-1",
  ...(details === undefined ? {} : { details }),
});

describe("what a refused or unanswered write says (the lead's review, LOW 7)", () => {
  it("never says nothing was changed when the result is unknown", () => {
    expect(refusalMessage(error("TIMEOUT"))).toBe(UNCONFIRMED);
    expect(
      refusalMessage(error("SERVICE_UNAVAILABLE", { stage: "transport" })),
    ).toBe(UNCONFIRMED);
    expect(
      refusalMessage(
        error("SERVICE_UNAVAILABLE", { contract: "admin_close_association" }),
      ),
    ).toBe(UNCONFIRMED);
    expect(UNCONFIRMED).toBe(
      "We couldn't confirm this. Check the list before trying again.",
    );
    expect(UNCONFIRMED).not.toMatch(/nothing/i);
  });

  it("says nothing was changed when Core answered with an error", () => {
    expect(refusalMessage(error("SERVICE_UNAVAILABLE"))).toMatch(
      /Nothing was opened or changed/,
    );
  });

  it("states 0086's letter-reference rule", () => {
    expect(
      refusalMessage(
        error("VALIDATION_ERROR", { reason: "letter_reference" }),
        ASSOCIATION_REASONS,
      ),
    ).toContain("4 to 60 letters");
  });
});
