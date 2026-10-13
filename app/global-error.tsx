"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="grid min-h-screen place-items-center bg-[var(--km-color-page)] p-6 text-[var(--km-color-text)]">
          <section className="max-w-lg rounded-2xl border border-[var(--km-color-border)] bg-[var(--km-color-surface)] p-8">
            <p className="text-sm font-bold text-[var(--km-color-warning)] uppercase">
              KitaMo Admin
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--km-color-text)]">
              The application needs to reload
            </h1>
            <p className="mt-3 text-[var(--km-color-text-secondary)]">
              An unexpected application error occurred. No operational changes
              were made.
            </p>
            <button
              className="mt-6 rounded-lg bg-[var(--km-color-action)] px-4 py-2.5 font-semibold text-white"
              onClick={reset}
              type="button"
            >
              Reload application
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
