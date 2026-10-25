import Link from "next/link";

/**
 * A missing admin view inside the admin shell (the lead's decision on 84963c8): a signed-in admin keeps the
 * header, the read-only line, the bottom bar and the footer's Privacy · Terms. Unmatched addresses still get
 * the root not-found (app/not-found.tsx), which carries the line too. Same words as the root page.
 */
export default function AdminNotFound() {
  return (
    <div className="admin-page">
      <section className="mx-auto w-full max-w-lg rounded-[var(--km-radius-surface)] bg-[var(--km-color-muted)] p-6 sm:p-8">
        <div className="mb-5 grid size-12 place-items-center rounded-xl bg-[var(--km-color-warning-soft)] font-bold text-[var(--km-color-warning-ink)]">
          404
        </div>
        <p className="text-xs font-bold tracking-[0.12em] text-[var(--km-color-text-secondary)] uppercase">
          Page not found
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-[-0.022em] text-[var(--km-color-text)]">
          That admin view does not exist
        </h1>
        <p className="mt-3 text-[var(--km-color-text-secondary)]">
          Check the address or return to the operational overview.
        </p>
        <Link
          className="km-button mt-6 w-full sm:w-auto"
          href="/overview"
          prefetch={false}
        >
          Go to overview
        </Link>
      </section>
    </div>
  );
}
