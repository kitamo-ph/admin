/** The legal line (mkt-adm-01, word for word): on every signed-in page at every width, and on the plain states. */
export const READ_ONLY_LINE =
  "Read-only toward businesses · every view is logged";

/** The design pass (KM Header, Admin): the line in small capitals with a lock, in the secondary text colour. */
export function ReadOnlyLine({ className = "" }: { className?: string }) {
  return (
    <p
      className={`flex items-center gap-2 text-xs leading-snug font-bold tracking-[0.06em] text-[var(--km-color-text-secondary)] uppercase ${className}`}
    >
      <svg
        aria-hidden="true"
        className="shrink-0"
        fill="none"
        height="14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.25"
        viewBox="0 0 24 24"
        width="14"
      >
        <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
      </svg>
      {READ_ONLY_LINE}
    </p>
  );
}
