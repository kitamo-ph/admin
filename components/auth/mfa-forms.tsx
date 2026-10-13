"use client";

import { useState, type FormEvent } from "react";

type ErrorReply = { error?: { message?: string } } | null;

async function messageOf(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as ErrorReply;
  return body?.error?.message ?? "That didn't go through. Try again.";
}

/** The 6-digit code from the authenticator app: challenge and verify, then aal2. */
export function MfaCodeForm({
  factorId,
  returnTo,
}: {
  factorId: string;
  returnTo: string;
}) {
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/session/mfa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ factorId, code }),
      });
      if (response.ok) {
        window.location.replace(returnTo);
        return;
      }
      if (response.status === 401) {
        window.location.replace("/sign-in?why=expired");
        return;
      }
      setError(await messageOf(response));
      setCode("");
    } catch {
      setError("Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={submit}
      aria-label="Authenticator code"
    >
      <label className="km-label">
        6-digit code
        <input
          autoComplete="one-time-code"
          className="control km-input tracking-[0.3em]"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          pattern="\d{6}"
          required
          value={code}
        />
      </label>
      {error !== "" ? (
        <p className="km-alert" role="alert">
          {error}
        </p>
      ) : null}
      <button className="km-button" disabled={pending} type="submit">
        {pending ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}

type Enrollment = { factorId: string; qrCode: string; secret: string };

/** First sign-in on the admin account: set up the authenticator app (TOTP). */
export function MfaEnrollForm({ returnTo }: { returnTo: string }) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/session/mfa/enroll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: "{}",
      });
      if (response.ok) {
        setEnrollment((await response.json()) as Enrollment);
        return;
      }
      if (response.status === 401) {
        window.location.replace("/sign-in?why=expired");
        return;
      }
      if (response.status === 409) {
        window.location.replace(
          `/mfa?returnTo=${encodeURIComponent(returnTo)}`,
        );
        return;
      }
      setError(await messageOf(response));
    } catch {
      setError("Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (enrollment === null) {
    return (
      <div className="grid gap-4">
        {error !== "" ? (
          <p className="km-alert" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="km-button"
          disabled={pending}
          onClick={start}
          type="button"
        >
          {pending ? "Preparing…" : "Set up the authenticator app"}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <ol className="km-steps">
        <li>Open your authenticator app and add an account.</li>
        <li>Scan this code, or type the setup key.</li>
        <li>Enter the 6-digit code the app shows.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element -- an SVG data URI from KitaMo's Auth */}
      <img
        alt="QR code for the authenticator app"
        className="km-qr"
        height={192}
        src={enrollment.qrCode}
        width={192}
      />
      <p className="km-hint">
        Setup key: <code className="break-all">{enrollment.secret}</code>
      </p>
      <MfaCodeForm factorId={enrollment.factorId} returnTo={returnTo} />
    </div>
  );
}

/** Ends the KitaMo session on this site (DELETE /api/session). */
export function SignOutButton({
  label = "Sign out",
  className = "km-button-secondary",
}: {
  label?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  async function signOut() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/session", {
        method: "DELETE",
        credentials: "same-origin",
      });
    } finally {
      window.location.replace("/sign-in?why=signed_out");
    }
  }
  return (
    <button
      className={className}
      disabled={pending}
      onClick={signOut}
      type="button"
    >
      {pending ? "Signing out…" : label}
    </button>
  );
}
