export function FilterBar({
  children,
  resetHref,
  resultLabel,
}: {
  children: React.ReactNode;
  resetHref: string;
  resultLabel?: string;
}) {
  return (
    <form
      className="mb-5 rounded-xl border border-[var(--km-color-border)] bg-[var(--km-color-surface)] p-4 shadow-[var(--shadow-card)]"
      method="get"
      role="search"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {children}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="min-h-10 rounded-lg bg-[var(--km-color-action)] px-4 py-2 font-semibold text-white hover:bg-[var(--km-color-action-hover)]"
            type="submit"
          >
            Apply filters
          </button>
          <a
            className="min-h-10 rounded-lg border border-[var(--km-color-border-strong)] bg-white px-4 py-2 font-semibold text-[var(--km-color-text)] hover:bg-[var(--km-color-muted)]"
            href={resetHref}
          >
            Reset
          </a>
        </div>
      </div>
      {resultLabel ? (
        <p
          className="mt-3 text-xs text-[var(--km-color-text-secondary)]"
          role="status"
        >
          {resultLabel}
        </p>
      ) : null}
    </form>
  );
}

export function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-[var(--km-color-text-secondary)]">
      {label}
      {children}
    </label>
  );
}
