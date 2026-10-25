"use client";

import { useEffect } from "react";

import { PublicShell } from "@/components/layout/public-shell";

/**
 * A failure in the admin shell itself (a failed admin page renders inside the shell: app/(admin)/error.tsx).
 * The lead's pass-2 review: on PublicShell, as Unavailable and Maintenance are (the canvas's 420 px column,
 * full-width capsules, no shadowed card), with the read-only line and Privacy · Terms. Same words.
 */
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
    <PublicShell
      description="No changes were made. Try the request again, or return to the overview if the issue continues."
      eyebrow="Something went wrong"
      readOnlyLine
      title="This view could not be loaded"
    >
      <div className="grid gap-3">
        <button
          className="km-button min-h-14 w-full"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
        <a
          className="km-button-secondary min-h-[3.25rem] w-full"
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
    </PublicShell>
  );
}
