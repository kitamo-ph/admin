"use client";

import { useEffect } from "react";

/**
 * An admin page that failed, inside the admin shell (the lead's decision on 84963c8): the header, the read-only
 * line, the bottom bar and the footer's Privacy · Terms stay. A failure in the shell itself still falls to the
 * root error page (app/error.tsx), which carries the line too. Same words as the root page.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("KitaMo Admin route error", {
      name: error.name,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="admin-page">
      <section className="mx-auto w-full max-w-lg rounded-[var(--km-radius-surface)] bg-[var(--km-color-muted)] p-6 sm:p-8">
        <div className="mb-5 grid size-11 place-items-center rounded-xl bg-[var(--km-color-destructive-soft)] text-xl text-[var(--km-color-destructive)]">
          !
        </div>
        <p className="mb-2 text-xs font-bold tracking-[0.12em] text-[var(--km-color-warning-ink)] uppercase">
          Something went wrong
        </p>
        <h1 className="text-2xl font-bold tracking-[-0.022em] text-[var(--km-color-text)]">
          This view could not be loaded
        </h1>
        <p className="mt-3 text-[var(--km-color-text-secondary)]">
          No changes were made. Try the request again, or return to the overview
          if the issue continues.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="km-button" onClick={() => retry()} type="button">
            Try again
          </button>
          <a className="km-button-secondary" href="/overview">
            Return to overview
          </a>
        </div>
        {error.digest ? (
          <p className="mt-6 text-xs text-[var(--km-color-text-secondary)]">
            Reference: <code>{error.digest}</code>
          </p>
        ) : null}
      </section>
    </div>
  );
}
