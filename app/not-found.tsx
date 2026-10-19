import Link from "next/link";

import { LegalLinks } from "@/components/layout/legal-links";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-lg rounded-2xl border border-[var(--km-color-border)] bg-[var(--km-color-surface)] p-8 shadow-[var(--shadow-card)]">
        <div className="mb-5 grid size-12 place-items-center rounded-xl bg-[var(--km-color-warning-soft)] font-bold text-[var(--km-color-warning)]">
          404
        </div>
        <p className="text-xs font-bold tracking-[0.12em] text-[var(--km-color-text-secondary)] uppercase">
          Page not found
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--km-color-text)]">
          That admin view does not exist
        </h1>
        <p className="mt-3 text-[var(--km-color-text-secondary)]">
          Check the address or return to the operational overview.
        </p>
        <Link
          className="mt-6 inline-flex rounded-lg bg-[var(--km-color-action)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--km-color-action-hover)]"
          href="/overview"
          prefetch={false}
        >
          Go to overview
        </Link>
        <LegalLinks className="mt-6 text-xs text-[var(--km-color-text-secondary)]" />
      </section>
    </main>
  );
}
