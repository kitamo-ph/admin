"use client";

import { useActionState } from "react";

import {
  addOfficerAction,
  closeAssociationAction,
  createAssociationAction,
  endOfficerAction,
  rotateCodeAction,
  type ChangeState,
  type CreateState,
  type OfficerState,
} from "@/app/(admin)/associations/actions";
import {
  ASSOCIATION_AREA_MAX,
  ASSOCIATION_KIND_LABELS,
  ASSOCIATION_NAME_MAX,
  LETTER_REFERENCE_MAX,
  OFFICER_LABEL_MAX,
} from "@/lib/admin/r16-rules";
import { associationKindSchema } from "@/lib/admin/r16-schemas";

function Alert({ message }: { message: string | undefined }) {
  return message ? (
    <p className="km-alert" role="alert">
      {message}
    </p>
  ) : null;
}

function FieldError({ message }: { message: string | undefined }) {
  return message ? <p className="km-error">{message}</p> : null;
}

/** Create an association after checking its letter (D18 §2): name, kind, place, reference. */
export function CreateAssociationForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState<CreateState, FormData>(
    createAssociationAction,
    {},
  );
  return (
    <form
      action={formAction}
      aria-label="Create an association"
      className="grid gap-4 p-5"
    >
      <input name="requestId" type="hidden" value={requestId} />
      <label className="km-label">
        Name
        <input
          autoComplete="off"
          className="control km-input"
          maxLength={ASSOCIATION_NAME_MAX}
          name="name"
          placeholder="e.g. Villa Rosa Homeowners"
        />
      </label>
      <FieldError message={state.errors?.name} />
      <fieldset className="grid gap-2">
        <legend className="km-label">Kind</legend>
        <div className="flex flex-wrap gap-4">
          {associationKindSchema.options.map((kind) => (
            <label className="flex min-h-11 items-center gap-2" key={kind}>
              <input
                className="size-5 accent-[var(--km-color-action)]"
                name="kind"
                type="radio"
                value={kind}
              />
              {ASSOCIATION_KIND_LABELS[kind]}
            </label>
          ))}
        </div>
      </fieldset>
      <FieldError message={state.errors?.kind} />
      <label className="km-label">
        Place (optional)
        <input
          autoComplete="off"
          className="control km-input"
          maxLength={ASSOCIATION_AREA_MAX}
          name="area"
          placeholder="e.g. Villa Rosa, Brgy. San Roque, Antipolo"
        />
      </label>
      <FieldError message={state.errors?.area} />
      <label className="km-label">
        Letter reference
        <input
          autoComplete="off"
          className="control km-input"
          maxLength={LETTER_REFERENCE_MAX}
          name="letterReference"
          placeholder="The reference of the letter you checked"
        />
      </label>
      <FieldError message={state.errors?.letterReference} />
      <Alert message={state.message} />
      <div>
        <button className="km-button" disabled={pending} type="submit">
          {pending ? "Creating…" : "Create the association"}
        </button>
      </div>
      <p className="km-hint">
        Create one only after checking a letter from the association. Its
        officers then see, for each stall that joins with the code, only whether
        it is open, its hours and, if the seller allows it, how busy it is.
      </p>
    </form>
  );
}

/** Add an officer by the email of their KitaMo account, with the name members see. */
export function AddOfficerForm({
  associationId,
  requestId,
}: {
  associationId: string;
  requestId: string;
}) {
  const [state, formAction, pending] = useActionState<OfficerState, FormData>(
    addOfficerAction,
    {},
  );
  return (
    <form
      action={formAction}
      aria-label="Add an officer"
      className="grid gap-4"
    >
      <input name="associationId" type="hidden" value={associationId} />
      <input name="requestId" type="hidden" value={requestId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="km-label">
          Officer&apos;s KitaMo email
          <input
            autoComplete="off"
            className="control km-input"
            maxLength={254}
            name="email"
            type="email"
          />
        </label>
        <label className="km-label">
          Name and role members see
          <input
            autoComplete="off"
            className="control km-input"
            maxLength={OFFICER_LABEL_MAX}
            name="label"
            placeholder="e.g. Juan D., President"
          />
        </label>
      </div>
      <FieldError message={state.errors?.email} />
      <FieldError message={state.errors?.label} />
      <Alert message={state.message} />
      <div>
        <button className="km-button" disabled={pending} type="submit">
          {pending ? "Adding…" : "Add the officer"}
        </button>
      </div>
      <p className="km-hint">
        The officer signs up for KitaMo first, with no business. They see the
        board only after they sign in and accept the role.
      </p>
    </form>
  );
}

/** End one officer's role (their row stays, with when it ended). */
export function EndOfficerForm({
  associationId,
  officerId,
  label,
  requestId,
}: {
  associationId: string;
  officerId: string;
  label: string;
  requestId: string;
}) {
  const [state, formAction, pending] = useActionState<ChangeState, FormData>(
    endOfficerAction,
    {},
  );
  return (
    <form action={formAction} aria-label={`End ${label}'s role`}>
      <input name="associationId" type="hidden" value={associationId} />
      <input name="officerId" type="hidden" value={officerId} />
      <input name="requestId" type="hidden" value={requestId} />
      <button
        className="km-button-secondary km-button-small"
        disabled={pending}
        type="submit"
      >
        {pending ? "Ending…" : "End this officer's role"}
      </button>
      <Alert message={state.message} />
    </form>
  );
}

/** A new join code: the old one stops working for joins; members stay. */
export function RotateCodeForm({
  associationId,
  requestId,
}: {
  associationId: string;
  requestId: string;
}) {
  const [state, formAction, pending] = useActionState<ChangeState, FormData>(
    rotateCodeAction,
    {},
  );
  return (
    <form
      action={formAction}
      aria-label="Change the join code"
      className="grid gap-3"
    >
      <input name="associationId" type="hidden" value={associationId} />
      <input name="requestId" type="hidden" value={requestId} />
      <p className="km-hint">
        For a code that reached the wrong people. Sellers who joined stay.
      </p>
      <Alert message={state.message} />
      <div>
        <button
          className="km-button-secondary"
          disabled={pending}
          type="submit"
        >
          {pending ? "Changing…" : "Rotate the join code"}
        </button>
      </div>
    </form>
  );
}

/** Close the association: every member stall leaves it, and it takes no more joins. */
export function CloseAssociationForm({
  associationId,
  requestId,
}: {
  associationId: string;
  requestId: string;
}) {
  const [state, formAction, pending] = useActionState<ChangeState, FormData>(
    closeAssociationAction,
    {},
  );
  return (
    <form
      action={formAction}
      aria-label="Close the association"
      className="grid gap-3"
    >
      <input name="associationId" type="hidden" value={associationId} />
      <input name="requestId" type="hidden" value={requestId} />
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          className="size-5 accent-[var(--km-color-action)]"
          name="confirm"
          type="checkbox"
          value="yes"
        />
        Every member stall leaves this association, and its officers see nothing
        more.
      </label>
      <FieldError message={state.errors?.confirm} />
      <Alert message={state.message} />
      <div>
        <button
          className="km-button-secondary"
          disabled={pending}
          type="submit"
        >
          {pending ? "Closing…" : "Close the association"}
        </button>
      </div>
    </form>
  );
}
