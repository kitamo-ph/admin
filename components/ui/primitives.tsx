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
          <p className="mb-1.5 text-xs font-bold tracking-[0.13em] text-[#b98621] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[#173f30] sm:text-[1.8rem]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl leading-6 text-[#69736d]">{description}</p>
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
      <ol className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#69736d]">
        {items.map((item, index) => (
          <li
            className="flex items-center gap-2"
            key={`${item.label}-${index}`}
          >
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link
                className="rounded hover:text-[#173f30] hover:underline"
                href={item.href}
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-[#364039]">
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
      className={`rounded-xl border border-[#dfe4df] bg-[#fffefa] shadow-[var(--shadow-card)] ${className}`}
    >
      {title || description || action ? (
        <header className="flex flex-col justify-between gap-3 border-b border-[#e7ebe7] px-5 py-4 sm:flex-row sm:items-center">
          <div>
            {title ? (
              <h2 className="font-semibold tracking-[-0.01em] text-[#173f30]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-sm text-[#69736d]">{description}</p>
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
    default: "bg-[#f0f6f2] text-[#1e513d]",
    success: "bg-[#e2f1e8] text-[#28734f]",
    warning: "bg-[#fbf0d5] text-[#8a6115]",
    danger: "bg-[#f9e7e4] text-[#a53b31]",
  };

  return (
    <article className="min-w-0 rounded-xl border border-[#dfe4df] bg-[#fffefa] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[#69736d]">{label}</p>
        {icon ? (
          <span
            aria-hidden="true"
            className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${toneClasses[tone]}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-[1.75rem] leading-none font-semibold tracking-[-0.035em] text-[#173f30]">
        {value}
      </p>
      <p className="mt-3 text-xs leading-5 text-[#69736d]">{context}</p>
    </article>
  );
}

export type BadgeTone =
  "neutral" | "success" | "warning" | "danger" | "info" | "forest";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "border-[#dfe4df] bg-[#f4f5f2] text-[#59625c]",
  success: "border-[#cae4d5] bg-[#e2f1e8] text-[#226744]",
  warning: "border-[#eedcae] bg-[#fbf0d5] text-[#79530d]",
  danger: "border-[#edcfca] bg-[#f9e7e4] text-[#92342b]",
  info: "border-[#cddde9] bg-[#e7f0f7] text-[#315f81]",
  forest: "border-[#c9ded1] bg-[#e3efe8] text-[#1e513d]",
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
        <div className="mx-auto mb-4 grid size-11 place-items-center rounded-xl bg-[#f0f6f2] text-lg font-bold text-[#1e513d]">
          —
        </div>
        <h2 className="font-semibold text-[#173f30]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#69736d]">{description}</p>
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
    info: "border-[#cddde9] bg-[#edf4f8] text-[#315f81]",
    warning: "border-[#eedcae] bg-[#fff7e5] text-[#79530d]",
    danger: "border-[#edcfca] bg-[#fdf0ee] text-[#92342b]",
    success: "border-[#cae4d5] bg-[#ebf6ef] text-[#226744]",
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
          <dt className="text-xs font-semibold tracking-[0.04em] text-[#69736d] uppercase">
            {item.label}
          </dt>
          <dd className="mt-1.5 min-w-0 font-medium text-[#28312b]">
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
    <p className="px-5 py-3 text-xs text-[#69736d]">
      Showing <strong className="text-[#364039]">{shown}</strong> of{" "}
      <strong className="text-[#364039]">{total}</strong> records
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
      className="flex items-center justify-between gap-4 border-t border-[#e7ebe7] px-5 py-3"
    >
      <p className="text-xs text-[#69736d]">
        {total === 0
          ? "No records"
          : `${offset + 1}–${Math.min(offset + limit, total)} of ${total}`}
      </p>
      <div className="flex gap-2">
        {hasPrevious ? (
          <Link
            className="rounded-md border border-[#cbd3cc] bg-white px-3 py-1.5 text-xs font-semibold text-[#173f30] hover:bg-[#f0f6f2]"
            href={pageHref(Math.max(0, offset - limit))}
          >
            Previous
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="cursor-not-allowed rounded-md border border-[#e3e7e3] bg-[#f8f8f5] px-3 py-1.5 text-xs font-semibold text-[#a0a7a2]"
          >
            Previous
          </span>
        )}
        {hasNext ? (
          <Link
            className="rounded-md border border-[#cbd3cc] bg-white px-3 py-1.5 text-xs font-semibold text-[#173f30] hover:bg-[#f0f6f2]"
            href={pageHref(offset + limit)}
          >
            Next
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="cursor-not-allowed rounded-md border border-[#e3e7e3] bg-[#f8f8f5] px-3 py-1.5 text-xs font-semibold text-[#a0a7a2]"
          >
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
