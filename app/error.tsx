"use client";

import { useEffect } from "react";

import { LegalLinks } from "@/components/layout/legal-links";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("KitaMo Admin route error", {
      name: error.name,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-lg rounded-2xl border border-[var(--km-color-border)] bg-[var(--km-color-surface)] p-8 shadow-[var(--shadow-card)]">
        <div className="mb-5 grid size-11 place-items-center rounded-xl bg-[var(--km-color-destructive-soft)] text-xl text-[var(--km-color-destructive)]">
          !
        </div>
        <p className="mb-2 text-xs font-bold tracking-[0.12em] text-[var(--km-color-warning)] uppercase">
          Something went wrong
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--km-color-text)]">
          This view could not be loaded
        </h1>
        <p className="mt-3 text-[var(--km-color-text-secondary)]">
          No changes were made. Try the request again, or return to the overview
          if the issue continues.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-lg bg-[var(--km-color-action)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--km-color-action-hover)]"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
          <a
            className="rounded-lg border border-[var(--km-color-border-strong)] px-4 py-2.5 font-semibold text-[var(--km-color-text)] hover:bg-[var(--km-color-muted)]"
            href="/overview"
          >
            Return to overview
          </a>
        </div>
        {error.digest ? (
          <p className="mt-6 text-xs text-[var(--km-color-text-secondary)]">
            Reference: <code>{error.digest}</code>
          </p>
        ) : null}
        <LegalLinks className="mt-6 text-xs text-[var(--km-color-text-secondary)]" />
      </section>
    </main>
  );
}
