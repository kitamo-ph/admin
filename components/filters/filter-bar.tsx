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
      className="mb-5 rounded-xl border border-[#dfe4df] bg-[#fffefa] p-4 shadow-[var(--shadow-card)]"
      method="get"
      role="search"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {children}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="min-h-10 rounded-lg bg-[#173f30] px-4 py-2 font-semibold text-white hover:bg-[#1e513d]"
            type="submit"
          >
            Apply filters
          </button>
          <a
            className="min-h-10 rounded-lg border border-[#cbd3cc] bg-white px-4 py-2 font-semibold text-[#173f30] hover:bg-[#f0f6f2]"
            href={resetHref}
          >
            Reset
          </a>
        </div>
      </div>
      {resultLabel ? (
        <p className="mt-3 text-xs text-[#69736d]" role="status">
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
    <label className="grid gap-1.5 text-xs font-semibold text-[#4f5a53]">
      {label}
      {children}
    </label>
  );
}
