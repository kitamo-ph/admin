"use client";

import { useEffect } from "react";

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
      <section className="w-full max-w-lg rounded-2xl border border-[#dfe4df] bg-[#fffefa] p-8 shadow-[var(--shadow-card)]">
        <div className="mb-5 grid size-11 place-items-center rounded-xl bg-[#f9e7e4] text-xl text-[#a53b31]">
          !
        </div>
        <p className="mb-2 text-xs font-bold tracking-[0.12em] text-[#8a6115] uppercase">
          Something went wrong
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#173f30]">
          This view could not be loaded
        </h1>
        <p className="mt-3 text-[#69736d]">
          No changes were made. Try the request again, or return to the
          overview if the issue continues.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-lg bg-[#173f30] px-4 py-2.5 font-semibold text-white hover:bg-[#1e513d]"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
          <a
            className="rounded-lg border border-[#cbd3cc] px-4 py-2.5 font-semibold text-[#173f30] hover:bg-[#f0f6f2]"
            href="/overview"
          >
            Return to overview
          </a>
        </div>
        {error.digest ? (
          <p className="mt-6 text-xs text-[#69736d]">
            Reference: <code>{error.digest}</code>
          </p>
        ) : null}
      </section>
    </main>
  );
}
