import Link from "next/link";

import { LegalLinks } from "@/components/layout/legal-links";
import { ReadOnlyLine } from "@/components/layout/read-only-line";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-lg rounded-2xl border border-[var(--km-color-border)] bg-[var(--km-color-surface)] p-8 shadow-[var(--shadow-card)]">
        {/* The lead's decision on 84963c8: the full-screen states carry the read-only line too. */}
        <ReadOnlyLine className="mb-6" />
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
        <Link className="km-button mt-6" href="/overview" prefetch={false}>
          Go to overview
        </Link>
        <LegalLinks className="mt-6 text-xs text-[var(--km-color-text-secondary)]" />
      </section>
    </main>
  );
}
