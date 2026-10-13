"use client";

import { useActionState, useState } from "react";

import {
  raiseFlagAction,
  type RaiseState,
} from "@/app/(admin)/businesses/[businessId]/actions";
import {
  reviewFlagAction,
  type ReviewState,
} from "@/app/(admin)/flags/actions";
import { FLAG_TRANSITIONS } from "@/lib/admin/r16-rules";
import type { FlagKind, FlagStatus } from "@/lib/admin/r16-schemas";

const KINDS: { value: FlagKind; label: string }[] = [
  { value: "health_mismatch", label: "Health mismatch" },
  { value: "unusual_activity", label: "Unusual activity" },
  { value: "other", label: "Other" },
];

/** "Raise a flag" from a Summary (D27 §6): counts and a check name, never text. */
export function RaiseFlagForm({
  businessId,
  requestId,
  healthCounts,
}: {
  businessId: string;
  requestId: string;
  healthCounts: Record<string, number>;
}) {
  const [state, formAction, pending] = useActionState<RaiseState, FormData>(
    raiseFlagAction,
    {},
  );
  return (
    <form action={formAction} aria-label="Raise a flag" className="grid gap-4">
      <input name="businessId" type="hidden" value={businessId} />
      <input name="requestId" type="hidden" value={requestId} />
      <input
        name="healthCounts"
        type="hidden"
        value={JSON.stringify(healthCounts)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="km-label">
          Kind
          <select className="control km-input" defaultValue="" name="kind">
            <option disabled value="">
              Choose a kind
            </option>
            {KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
        </label>
        <label className="km-label">
          Source
          <select className="control km-input" defaultValue="" name="source">
            <option disabled value="">
              Choose a source
            </option>
            <option value="health">The health counts</option>
            <option value="admin">Your own review</option>
          </select>
        </label>
      </div>
      {state.errors?.kind ? (
        <p className="km-error">{state.errors.kind}</p>
      ) : null}
      {state.errors?.source ? (
        <p className="km-error">{state.errors.source}</p>
      ) : null}
      <label className="km-label">
        Check name (optional; lowercase, digits, underscores)
        <input
          autoComplete="off"
          className="control km-input"
          maxLength={40}
          name="check"
          placeholder="e.g. stock_use"
        />
      </label>
      {state.errors?.check ? (
        <p className="km-error">{state.errors.check}</p>
      ) : null}
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          className="size-5 accent-[var(--km-color-action)]"
          name="attachHealth"
          type="checkbox"
          value="yes"
        />
        Attach the health counts shown above as evidence
      </label>
      {state.errors?.evidence ? (
        <p className="km-error">{state.errors.evidence}</p>
      ) : null}
      {state.message ? (
        <p className="km-alert" role="alert">
          {state.message}
        </p>
      ) : null}
      <div>
        <button className="km-button" disabled={pending} type="submit">
          {pending ? "Raising…" : "Raise the flag"}
        </button>
      </div>
      <p className="km-hint">
        A flag is a lead, not proof. It is never shown to the business and never
        changes anything there.
      </p>
    </form>
  );
}

const STATUS_LABELS: Record<FlagStatus, string> = {
  open: "Reopen",
  reviewing: "Reviewing",
  dismissed: "Dismiss",
  confirmed: "Confirm",
};

/** A flag's review: allowed transitions only; a note except for "reviewing". */
export function FlagReviewForm({
  flagId,
  status,
  requestId,
  returnTo,
}: {
  flagId: string;
  status: FlagStatus;
  requestId: string;
  returnTo: string;
}) {
  const [state, formAction, pending] = useActionState<ReviewState, FormData>(
    reviewFlagAction,
    {},
  );
  const options = FLAG_TRANSITIONS[status];
  const [next, setNext] = useState<FlagStatus>(options[0] ?? "reviewing");
  return (
    <form
      action={formAction}
      aria-label={`Review flag ${flagId.slice(0, 8)}`}
      className="grid gap-3"
    >
      <input name="flagId" type="hidden" value={flagId} />
      <input name="from" type="hidden" value={status} />
      <input name="requestId" type="hidden" value={requestId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className="km-label">
        Change to
        <select
          className="control km-input"
          name="status"
          onChange={(event) => setNext(event.target.value as FlagStatus)}
          value={next}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {STATUS_LABELS[option]}
            </option>
          ))}
        </select>
      </label>
      <label className="km-label">
        Note {next === "reviewing" ? "(optional)" : "(10 to 500 characters)"}
        <textarea className="control km-input" maxLength={500} name="note" />
      </label>
      {state.errors?.status ? (
        <p className="km-error">{state.errors.status}</p>
      ) : null}
      {state.errors?.note ? (
        <p className="km-error">{state.errors.note}</p>
      ) : null}
      {state.message ? (
        <p className="km-alert" role="alert">
          {state.message}
        </p>
      ) : null}
      <div>
        <button
          className="km-button-secondary"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : "Save the review"}
        </button>
      </div>
    </form>
  );
}
