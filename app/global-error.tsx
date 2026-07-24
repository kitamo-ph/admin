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
        <main className="grid min-h-screen place-items-center bg-[#f7f5ef] p-6 text-[#202622]">
          <section className="max-w-lg rounded-2xl border border-[#dfe4df] bg-[#fffefa] p-8">
            <p className="text-sm font-bold text-[#b98621] uppercase">
              KitaMo Admin
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[#173f30]">
              The application needs to reload
            </h1>
            <p className="mt-3 text-[#69736d]">
              An unexpected application error occurred. No operational changes
              were made.
            </p>
            <button
              className="mt-6 rounded-lg bg-[#173f30] px-4 py-2.5 font-semibold text-white"
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
