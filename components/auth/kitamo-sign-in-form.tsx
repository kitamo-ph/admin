"use client";

import Script from "next/script";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import type { CaptchaConfiguration } from "@/lib/auth/kitamo/captcha";

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Operations' Turnstile challenge (dbe4ca6), English only: explicit render, one token per try. */
function Turnstile({
  siteKey,
  attempt,
  onToken,
}: {
  siteKey: string;
  attempt: number;
  onToken: (token: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  // The script may already be on the page (a second visit): ready at once.
  const [ready, setReady] = useState(
    () => typeof window !== "undefined" && window.turnstile !== undefined,
  );
  const [message, setMessage] = useState<string | null>(null);
  const note =
    message ??
    (ready
      ? "Complete the security check to continue."
      : "Loading the security check…");
  useEffect(() => {
    const api = window.turnstile;
    if (!ready || box.current === null || api === undefined) return;
    let live = true;
    let id = "";
    try {
      id = api.render(box.current, {
        sitekey: siteKey,
        theme: "light",
        size: "compact",
        "response-field": false,
        retry: "never",
        "refresh-expired": "manual",
        callback: (token: string) => {
          if (!live) return;
          onToken(token.length > 2048 ? "" : token);
          setMessage("Security check complete.");
        },
        "expired-callback": () => {
          if (live) {
            onToken("");
            setMessage("The security check expired. Try again.");
          }
        },
        "error-callback": () => {
          if (live) {
            onToken("");
            setMessage(
              "The security check could not complete. Reload the page.",
            );
          }
        },
      });
    } catch {
      // Reported after this effect, not during it.
      queueMicrotask(() => {
        if (live) {
          setMessage("The security check could not load. Reload the page.");
        }
      });
    }
    return () => {
      live = false;
      onToken("");
      try {
        if (id !== "") api.remove(id);
      } catch {
        // A removed widget can no longer change this form.
      }
    };
  }, [ready, siteKey, attempt, onToken]);
  return (
    <div className="grid gap-2">
      <Script
        id="admin-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
        onReady={() => setReady(true)}
        onError={() =>
          setMessage(
            "The security check could not load. Check your connection and reload.",
          )
        }
      />
      <div ref={box} aria-label="Security check" />
      <p className="km-hint" role="status">
        {note}
      </p>
    </div>
  );
}

export function KitamoSignInForm({
  captcha,
  returnTo,
}: {
  captcha: CaptchaConfiguration;
  returnTo: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const onToken = useCallback((value: string) => setToken(value), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (captcha.mode === "widget" && token === "") {
      setError("Complete the security check to continue.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email,
          password,
          ...(captcha.mode === "widget" ? { captchaToken: token } : {}),
        }),
      });
      if (response.ok) {
        window.location.replace(
          `/mfa?returnTo=${encodeURIComponent(returnTo)}`,
        );
        return;
      }
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(body?.error?.message ?? "That didn't go through. Try again.");
    } catch {
      setError("Check your connection and try again.");
    } finally {
      setPending(false);
      setToken("");
      setAttempt((value) => value + 1);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit} aria-label="KitaMo sign-in">
      <label className="km-label">
        Email
        <input
          autoComplete="email"
          className="control km-input"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label className="km-label">
        Password
        <input
          autoComplete="current-password"
          className="control km-input"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      {captcha.mode === "widget" ? (
        <Turnstile
          attempt={attempt}
          onToken={onToken}
          siteKey={captcha.siteKey}
        />
      ) : null}
      {captcha.mode === "local-test" ? (
        <p className="km-hint">
          Local test sign-in: the security check is stubbed.
        </p>
      ) : null}
      {captcha.mode === "unavailable" ? (
        <p className="km-alert" role="alert">
          Sign-in is not available right now. Try again later.
        </p>
      ) : null}
      {error !== "" ? (
        <p className="km-alert" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="km-button"
        disabled={
          pending ||
          captcha.mode === "unavailable" ||
          (captcha.mode === "widget" && token === "")
        }
        type="submit"
      >
        {pending ? "Signing in…" : "Sign in with KitaMo"}
      </button>
    </form>
  );
}
