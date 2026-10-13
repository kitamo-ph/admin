"use client";

import { useActionState, useState, type FormEvent } from "react";

import {
  openAccessAction,
  type SheetState,
} from "@/app/(admin)/businesses/[businessId]/actions";
import {
  REASON_LABELS,
  REASON_TEXT_MIN,
  WITHHOLD_DAYS_MAX,
  WITHHOLD_LABELS,
  checkReasonSheet,
  type ReasonSheetField,
} from "@/lib/admin/r16-rules";
import type {
  AccessLevel,
  FlagKind,
  ReasonCode,
  WithholdCode,
} from "@/lib/admin/r16-schemas";

export type SheetFlag = {
  flagId: string;
  kind: FlagKind;
  status: "open" | "reviewing";
  createdAt: string;
};

const REASON_CODES = Object.keys(REASON_LABELS) as ReasonCode[];
const WITHHOLD_CODES = Object.keys(WITHHOLD_LABELS) as WithholdCode[];

/**
 * The reason sheet (spec §5.3, D27 §4.2): no access to a business without a
 * level, a reason code and a written reason of 20+ characters. Records are
 * break-glass: an open flag of this business, or a support or legal
 * reference. Withholding the disclosure is folded away: only where the law
 * requires, at most 90 days. The rules are checked here before anything is
 * sent, again on the server, and a third time by Core.
 */
export function ReasonSheet({
  businessId,
  businessLabel,
  requestId,
  initialLevel,
  levels,
  flags,
}: {
  businessId: string;
  businessLabel: string;
  /** A fresh idempotency key minted on the server for this sheet. */
  requestId: string;
  initialLevel: AccessLevel;
  /** Records only, when opening records from a live summary (never inherited). */
  levels: readonly AccessLevel[];
  flags: SheetFlag[];
}) {
  const [state, formAction, pending] = useActionState<SheetState, FormData>(
    openAccessAction,
    {},
  );
  const [level, setLevel] = useState<AccessLevel>(initialLevel);
  const [reasonText, setReasonText] = useState("");
  const [localErrors, setLocalErrors] = useState<
    Partial<Record<ReasonSheetField, string>>
  >({});
  const errors = { ...state.errors, ...localErrors };
  const length = reasonText.trim().length;

  function check(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const value = (name: string) => {
      const entry = data.get(name);
      return typeof entry === "string" ? entry : "";
    };
    const result = checkReasonSheet({
      level: value("level"),
      reasonCode: value("reasonCode"),
      reasonText: value("reasonText"),
      flagId: value("flagId"),
      reference: value("reference"),
      withholdCode: value("withholdCode"),
      withholdDays: value("withholdDays"),
    });
    if (!result.ok) {
      event.preventDefault();
      setLocalErrors(result.errors);
      return;
    }
    setLocalErrors({});
  }

  const errorId = (field: ReasonSheetField) =>
    errors[field] === undefined ? undefined : `sheet-${field}-error`;

  return (
    <form
      action={formAction}
      aria-label={`Reason sheet for ${businessLabel}`}
      className="grid gap-5"
      noValidate
      onSubmit={check}
    >
      <input name="businessId" type="hidden" value={businessId} />
      <input name="requestId" type="hidden" value={requestId} />

      <fieldset className="grid gap-2">
        <legend className="km-label mb-1">Level</legend>
        <div className="flex flex-wrap gap-3">
          {levels.map((option) => (
            <label
              className="km-button-secondary km-button-small cursor-pointer has-[:checked]:border-[var(--km-color-action)] has-[:checked]:bg-[var(--km-color-select-soft)]"
              key={option}
            >
              <input
                checked={level === option}
                className="size-4 accent-[var(--km-color-action)]"
                name="level"
                onChange={() => setLevel(option)}
                type="radio"
                value={option}
              />
              {option === "summary"
                ? "Summary (counts and totals)"
                : "Records (break-glass)"}
            </label>
          ))}
        </div>
        {errors.level ? <p className="km-error">{errors.level}</p> : null}
      </fieldset>

      <label className="km-label">
        Reason
        <select
          aria-describedby={errorId("reasonCode")}
          className="control km-input"
          defaultValue=""
          name="reasonCode"
        >
          <option disabled value="">
            Choose a reason
          </option>
          {REASON_CODES.map((code) => (
            <option key={code} value={code}>
              {REASON_LABELS[code][0]?.toUpperCase()}
              {REASON_LABELS[code].slice(1)}
            </option>
          ))}
        </select>
      </label>
      {errors.reasonCode ? (
        <p className="km-error" id="sheet-reasonCode-error">
          {errors.reasonCode}
        </p>
      ) : null}

      <label className="km-label">
        Why you need to look (at least {REASON_TEXT_MIN} characters)
        <textarea
          aria-describedby={`sheet-reasonText-count${errors.reasonText ? " sheet-reasonText-error" : ""}`}
          className="control km-input"
          maxLength={500}
          name="reasonText"
          onChange={(event) => setReasonText(event.target.value)}
          value={reasonText}
        />
      </label>
      <p className="km-hint" id="sheet-reasonText-count">
        {length} of at least {REASON_TEXT_MIN} characters. The business sees the
        reason code and the time, never this text.
      </p>
      {errors.reasonText ? (
        <p className="km-error" id="sheet-reasonText-error">
          {errors.reasonText}
        </p>
      ) : null}

      <fieldset className="grid gap-3">
        <legend className="km-label mb-1">
          Evidence{" "}
          {level === "records" ? "(required for Records)" : "(optional)"}
        </legend>
        <label className="km-label">
          An open flag of this business
          <select
            aria-describedby={errorId("evidence")}
            className="control km-input"
            defaultValue=""
            name="flagId"
          >
            <option value="">No flag</option>
            {flags.map((flag) => (
              <option key={flag.flagId} value={flag.flagId}>
                {flag.kind.replaceAll("_", " ")} · {flag.status} ·{" "}
                {flag.createdAt.slice(0, 10)}
              </option>
            ))}
          </select>
        </label>
        <label className="km-label">
          Or a support or legal reference
          <input
            aria-describedby={errorId("reference")}
            autoComplete="off"
            className="control km-input"
            maxLength={60}
            name="reference"
            placeholder="e.g. SUP-2026-0142"
          />
        </label>
        {errors.evidence ? (
          <p className="km-error" id="sheet-evidence-error">
            {errors.evidence}
          </p>
        ) : null}
        {errors.reference ? (
          <p className="km-error" id="sheet-reference-error">
            {errors.reference}
          </p>
        ) : null}
      </fieldset>

      <details className="rounded-[var(--km-radius-surface)] border border-[var(--km-color-border)] bg-[var(--km-color-surface)] p-3">
        <summary className="cursor-pointer font-semibold">
          Hold the disclosure (only where the law requires; at most{" "}
          {WITHHOLD_DAYS_MAX} days)
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="km-label">
            Why it is held
            <select
              className="control km-input"
              defaultValue=""
              name="withholdCode"
            >
              <option value="">Not held</option>
              {WITHHOLD_CODES.map((code) => (
                <option key={code} value={code}>
                  {WITHHOLD_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
          <label className="km-label">
            Days (1 to {WITHHOLD_DAYS_MAX})
            <input
              className="control km-input"
              inputMode="numeric"
              max={WITHHOLD_DAYS_MAX}
              min={1}
              name="withholdDays"
              type="number"
            />
          </label>
        </div>
        <p className="km-hint mt-2">
          Only with a legal request or a flag review. The business sees this
          check when the hold ends, at its true time.
        </p>
        {errors.withhold ? (
          <p className="km-error mt-2" id="sheet-withhold-error">
            {errors.withhold}
          </p>
        ) : null}
      </details>

      {state.message ? (
        <p className="km-alert" role="alert">
          {state.message}
        </p>
      ) : null}
      {Object.keys(localErrors).length > 0 ? (
        <p className="km-alert" role="alert">
          Nothing was opened. Fix the marked fields first.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button className="km-button" disabled={pending} type="submit">
          {pending
            ? "Opening…"
            : level === "records"
              ? "Open records for 30 minutes"
              : "Open the summary for 30 minutes"}
        </button>
        <p className="km-hint">
          The access is logged, ends after 30 minutes, and is shown to the
          business in KitaMo.
        </p>
      </div>
    </form>
  );
}
