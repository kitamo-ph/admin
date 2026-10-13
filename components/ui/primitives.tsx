import Link from "next/link";

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
  return (
    <header className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-1.5 text-xs font-bold tracking-[0.13em] text-[var(--km-color-warning)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--km-color-text)] sm:text-[1.8rem]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl leading-6 text-[var(--km-color-text-secondary)]">
          {description}
        </p>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--km-color-text-secondary)]">
        {items.map((item, index) => (
          <li
            className="flex items-center gap-2"
            key={`${item.label}-${index}`}
          >
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link
                className="rounded hover:text-[var(--km-color-text)] hover:underline"
                href={item.href}
              >
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
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-[var(--km-color-border)] bg-[var(--km-color-surface)] shadow-[var(--shadow-card)] ${className}`}
    >
      {title || description || action ? (
        <header className="flex flex-col justify-between gap-3 border-b border-[var(--km-color-border)] px-5 py-4 sm:flex-row sm:items-center">
          <div>
            {title ? (
              <h2 className="font-semibold tracking-[-0.01em] text-[var(--km-color-text)]">
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
    <article className="min-w-0 rounded-xl border border-[var(--km-color-border)] bg-[var(--km-color-surface)] p-5 shadow-[var(--shadow-card)]">
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
    info: "border-[var(--km-color-info)] bg-[var(--km-color-info-soft)] text-[var(--km-color-info)]",
    warning:
      "border-[var(--km-color-accent)] bg-[var(--km-color-warning-soft)] text-[var(--km-color-warning-ink)]",
    danger:
      "border-[var(--km-color-destructive)] bg-[var(--km-color-destructive-soft)] text-[var(--km-color-destructive)]",
    success:
      "border-[var(--km-color-success)] bg-[var(--km-color-success-soft)] text-[var(--km-color-success)]",
  };

  return (
    <aside
      className={`mb-5 flex gap-3 rounded-xl border px-4 py-3.5 ${tones[tone]}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span aria-hidden="true" className="mt-0.5 font-bold">
        {tone === "danger" ? "!" : "i"}
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <div className="mt-0.5 text-sm opacity-85">{children}</div>
      </div>
    </aside>
  );
}

export function KeyValueGrid({
  items,
}: {
  items: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-semibold tracking-[0.04em] text-[var(--km-color-text-secondary)] uppercase">
            {item.label}
          </dt>
          <dd className="mt-1.5 min-w-0 font-medium text-[var(--km-color-text)]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function DataTable({
  label,
  children,
  minWidth = "48rem",
}: {
  label: string;
  children: React.ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table" aria-label={label} style={{ minWidth }}>
        {children}
      </table>
    </div>
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
    <p className="px-5 py-3 text-xs text-[var(--km-color-text-secondary)]">
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
      className="flex items-center justify-between gap-4 border-t border-[var(--km-color-border)] px-5 py-3"
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
