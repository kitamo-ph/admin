import Link from "next/link";

import { TableScroll } from "@/components/ui/table-scroll";
import { titleCase } from "@/lib/format";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  // The design pass (Adm Site canvas): the title at 26 px on a phone, up to 34 px on a laptop; the page's
  // action a capsule beside it (full width on a phone); the description stays visible (mkt-adm-15).
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-1.5 text-xs font-bold tracking-[0.08em] text-[var(--km-color-text-secondary)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[1.625rem] leading-[1.12] font-bold tracking-[-0.022em] text-balance text-[var(--km-color-text)] lg:text-[clamp(1.75rem,2.4vw,2.125rem)]">
          {title}
        </h1>
        <p className="mt-2 max-w-[62ch] text-[0.9375rem] leading-6 text-[var(--km-color-text-secondary)]">
          {description}
        </p>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 *:flex-1 md:*:flex-none">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex flex-wrap items-center gap-x-2 text-[0.9375rem] font-medium text-[var(--km-color-text-secondary)]">
        {items.map((item, index) => (
          <li
            className="flex min-w-0 items-center gap-2"
            key={`${item.label}-${index}`}
          >
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              // The design pass (the canvas's back link): a 44 px target in the action colour, a chevron first.
              <Link
                className={`inline-flex min-h-11 items-center gap-0.5 rounded-lg pr-2 text-[var(--km-color-action)] hover:underline ${
                  index === 0 ? "-ml-1.5" : "pl-2"
                }`}
                href={item.href}
                prefetch={false}
              >
                {index === 0 ? (
                  <svg
                    aria-hidden="true"
                    fill="none"
                    height="20"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.25"
                    viewBox="0 0 24 24"
                    width="20"
                  >
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                ) : null}
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-[var(--km-color-text)]">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className = "",
  boxed = false,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** A card at every width: the canvas's sheets and cards (the reason sheet, a flag, the association screens). */
  boxed?: boolean;
}) {
  return (
    // Design system v3 (ds-05): a card is a border and a 16 px radius, nothing more; its title is 20 px bold.
    // The lead's pass-2 review: from 1024 px (Pro) a section draws no box, as the Adm Site canvas does (no fill,
    // no padding, hairline rows on the white page; .km-panel). Simple keeps the bordered card, and so does a
    // boxed one (the canvas boxes those at every width). Its children pad with .km-panel-x.
    <section
      className={`min-w-0 rounded-[var(--km-radius-surface)] border border-[var(--km-color-border)] bg-[var(--km-color-surface)] ${
        boxed ? "" : "km-panel lg:rounded-none lg:border-0 lg:bg-transparent"
      } ${className}`}
    >
      {title || description || action ? (
        <header
          className={`km-panel-x flex flex-col justify-between gap-3 border-b border-[var(--km-color-border)] py-4 sm:flex-row sm:items-center ${
            boxed ? "" : "lg:pt-0 lg:pb-3"
          }`}
        >
          <div>
            {title ? (
              <h2 className="text-xl leading-tight font-bold text-[var(--km-color-text)]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-sm text-[var(--km-color-text-secondary)]">
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  context,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  context: string;
  tone?: "default" | "success" | "warning" | "danger";
  icon?: string;
}) {
  const toneClasses = {
    default: "bg-[var(--km-color-muted)] text-[var(--km-color-select)]",
    success: "bg-[var(--km-color-success-soft)] text-[var(--km-color-success)]",
    warning: "bg-[var(--km-color-warning-soft)] text-[var(--km-color-warning)]",
    danger:
      "bg-[var(--km-color-destructive-soft)] text-[var(--km-color-destructive)]",
  };

  return (
    <article className="min-w-0 rounded-[var(--km-radius-surface)] border border-[var(--km-color-border)] bg-[var(--km-color-surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--km-color-text-secondary)]">
          {label}
        </p>
        {icon ? (
          <span
            aria-hidden="true"
            className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${toneClasses[tone]}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-[1.75rem] leading-none font-semibold tracking-[-0.035em] text-[var(--km-color-text)]">
        {value}
      </p>
      <p className="mt-3 text-xs leading-5 text-[var(--km-color-text-secondary)]">
        {context}
      </p>
    </article>
  );
}

export type BadgeTone =
  "neutral" | "success" | "warning" | "danger" | "info" | "forest";

const badgeTones: Record<BadgeTone, string> = {
  neutral:
    "border-[var(--km-color-border)] bg-[var(--km-color-muted)] text-[var(--km-color-text-secondary)]",
  success:
    "border-[var(--km-color-success)] bg-[var(--km-color-success-soft)] text-[var(--km-color-success)]",
  warning:
    "border-[var(--km-color-accent)] bg-[var(--km-color-warning-soft)] text-[var(--km-color-warning-ink)]",
  danger:
    "border-[var(--km-color-destructive)] bg-[var(--km-color-destructive-soft)] text-[var(--km-color-destructive)]",
  info: "border-[var(--km-color-info)] bg-[var(--km-color-info-soft)] text-[var(--km-color-info)]",
  forest:
    "border-[var(--km-color-success)] bg-[var(--km-color-select-soft)] text-[var(--km-color-select)]",
};

export function Badge({
  value,
  label,
  tone,
}: {
  value: string;
  label?: string;
  tone?: BadgeTone;
}) {
  const resolvedTone =
    tone ??
    (["active", "healthy", "success", "resolved", "production"].includes(value)
      ? "success"
      : ["failed", "critical", "disabled", "conflict"].includes(value)
        ? "danger"
        : ["pending", "retrying", "stale", "high", "under_review"].includes(
              value,
            )
          ? "warning"
          : ["in_progress", "triaged", "waiting_for_user"].includes(value)
            ? "info"
            : "neutral");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${badgeTones[resolvedTone]}`}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-current opacity-70"
      />
      {label ?? titleCase(value)}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-64 place-items-center px-6 py-10 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid size-11 place-items-center rounded-xl bg-[var(--km-color-muted)] text-lg font-bold text-[var(--km-color-select)]">
          —
        </div>
        <h2 className="font-semibold text-[var(--km-color-text)]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--km-color-text-secondary)]">
          {description}
        </p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export function StateBanner({
  tone,
  title,
  children,
}: {
  tone: "info" | "warning" | "danger" | "success";
  title: string;
  children: React.ReactNode;
}) {
  const tones = {
    info: "border-transparent bg-[var(--km-color-info-soft)] text-[var(--km-color-info)]",
    warning:
      "border-transparent bg-[var(--km-color-warning-soft)] text-[var(--km-color-warning-ink)]",
    // A failure keeps its red edge: never colour alone.
    danger:
      "border-[var(--km-color-destructive)] bg-[var(--km-color-destructive-soft)] text-[var(--km-color-destructive)]",
    success:
      "border-transparent bg-[var(--km-color-success-soft)] text-[var(--km-color-success)]",
  };

  return (
    // The design pass (the canvas's callouts): a soft fill and a 12 px radius, the title in bold and the
    // sentence after it on the same line, at full colour. Same words.
    <aside
      className={`mb-5 rounded-xl border px-3.5 py-3 text-sm leading-[1.4] ${tones[tone]}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <p>
        <strong className="font-bold">{title}</strong>
        {/[.!?]$/.test(title) ? " " : " · "}
        {children}
      </p>
    </aside>
  );
}

export function KeyValueGrid({
  items,
}: {
  items: Array<{ label: string; value: React.ReactNode }>;
}) {
  // The design pass (the canvas's facts): two columns of label over value, a rule between the rows.
  return (
    <dl className="km-panel-x grid grid-cols-2 gap-x-4 pt-1 pb-3">
      {items.map((item) => (
        <div
          className="min-w-0 border-t border-[var(--km-color-border)] py-2.5 [&:nth-child(-n+2)]:border-t-0"
          key={item.label}
        >
          <dt className="text-xs font-semibold text-[var(--km-color-text-secondary)]">
            {item.label}
          </dt>
          <dd className="mt-0.5 min-w-0 text-[0.9375rem] font-semibold break-words text-[var(--km-color-text)]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const TABLE_LAYOUTS = {
  scroll: "data-table",
  /** Below 768 px, each row a card with every field labelled (each cell's data-label; one data-title). */
  cards: "data-table data-table-cards",
  /** The first column stays put while the rest scroll. */
  sticky: "data-table data-table-sticky",
} as const;

/**
 * A table that scrolls sideways when it is wider than its panel, with a cue while columns are hidden
 * (TableScroll). The design pass: "cards" turns each row into a card below 768 px.
 */
export function DataTable({
  label,
  children,
  minWidth = "48rem",
  layout = "scroll",
}: {
  label: string;
  children: React.ReactNode;
  minWidth?: string;
  layout?: keyof typeof TABLE_LAYOUTS;
}) {
  return (
    <TableScroll>
      <table
        aria-label={label}
        className={TABLE_LAYOUTS[layout]}
        style={{ minWidth }}
      >
        {children}
      </table>
    </TableScroll>
  );
}

export function PaginationSummary({
  shown,
  total,
}: {
  shown: number;
  total: number;
}) {
  return (
    <p className="km-panel-x py-3 text-xs text-[var(--km-color-text-secondary)]">
      Showing <strong className="text-[var(--km-color-text)]">{shown}</strong>{" "}
      of <strong className="text-[var(--km-color-text)]">{total}</strong>{" "}
      records
    </p>
  );
}

export function PaginationControls({
  basePath,
  offset,
  limit,
  total,
  query,
}: {
  basePath: string;
  offset: number;
  limit: number;
  total: number;
  query: Record<string, string | undefined>;
}) {
  const hasPrevious = offset > 0;
  const hasNext = offset + limit < total;

  function pageHref(nextOffset: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
    if (nextOffset > 0) params.set("offset", String(nextOffset));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <nav
      aria-label="Pagination"
      className="km-panel-x flex items-center justify-between gap-4 border-t border-[var(--km-color-border)] py-3"
    >
      <p className="text-xs text-[var(--km-color-text-secondary)]">
        {total === 0
          ? "No records"
          : `${offset + 1}–${Math.min(offset + limit, total)} of ${total}`}
      </p>
      <div className="flex gap-2">
        {hasPrevious ? (
          <Link
            className="rounded-md border border-[var(--km-color-border-strong)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--km-color-text)] hover:bg-[var(--km-color-muted)]"
            href={pageHref(Math.max(0, offset - limit))}
            prefetch={false}
          >
            Previous
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="cursor-not-allowed rounded-md border border-[var(--km-color-border)] bg-[var(--km-color-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--km-color-text-secondary)]"
          >
            Previous
          </span>
        )}
        {hasNext ? (
          <Link
            className="rounded-md border border-[var(--km-color-border-strong)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--km-color-text)] hover:bg-[var(--km-color-muted)]"
            href={pageHref(offset + limit)}
            prefetch={false}
          >
            Next
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="cursor-not-allowed rounded-md border border-[var(--km-color-border)] bg-[var(--km-color-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--km-color-text-secondary)]"
          >
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
