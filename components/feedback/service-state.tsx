import Link from "next/link";

import { Panel } from "@/components/ui/primitives";

type ServiceErrorShape = {
  code: string;
  message: string;
  correlationId: string;
  retryable: boolean;
};

export function ServiceErrorState({ error }: { error: ServiceErrorShape }) {
  const state = errorState(error.code);

  return (
    <Panel>
      <div className="grid min-h-80 place-items-center px-6 py-12 text-center">
        <div className="max-w-lg">
          <span
            aria-hidden="true"
            className={`mx-auto mb-5 grid size-12 place-items-center rounded-xl text-lg font-bold ${state.iconClass}`}
          >
            {state.symbol}
          </span>
          <p className="text-xs font-bold tracking-[0.12em] text-[var(--km-color-text-secondary)] uppercase">
            {state.eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--km-color-text)]">
            {state.title}
          </h2>
          <p className="mt-3 leading-6 text-[var(--km-color-text-secondary)]">
            {error.message}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {error.retryable ? (
              <Link
                className="rounded-lg bg-[var(--km-color-action)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--km-color-action-hover)]"
                href=""
                prefetch={false}
              >
                Try again
              </Link>
            ) : null}
            {/* /health is parked (a KitaMo session gets 404): the overview is the next step. */}
            <Link
              className="rounded-lg border border-[var(--km-color-border-strong)] bg-white px-4 py-2.5 font-semibold text-[var(--km-color-text)] hover:bg-[var(--km-color-muted)]"
              href="/overview"
              prefetch={false}
            >
              Back to the overview
            </Link>
          </div>
          <p className="mt-6 text-xs text-[var(--km-color-text-secondary)]">
            Correlation ID:{" "}
            <code className="break-all">{error.correlationId}</code>
          </p>
        </div>
      </div>
    </Panel>
  );
}

export function DataFreshness({
  generatedAt,
  stale,
}: {
  generatedAt: string;
  stale?: boolean;
}) {
  return (
    <p
      className={`inline-flex items-center gap-2 text-xs ${
        stale
          ? "font-semibold text-[var(--km-color-warning-ink)]"
          : "text-[var(--km-color-text-secondary)]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          stale
            ? "bg-[var(--km-color-warning)]"
            : "bg-[var(--km-color-success)]"
        }`}
      />
      {stale ? "Stale snapshot" : "Current snapshot"} ·{" "}
      {new Intl.DateTimeFormat("en-PH", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      }).format(new Date(generatedAt))}
    </p>
  );
}

function errorState(code: string) {
  switch (code) {
    case "MAINTENANCE":
      return {
        eyebrow: "Maintenance",
        title: "This operational view is temporarily paused",
        symbol: "⌁",
        iconClass:
          "bg-[var(--km-color-warning-soft)] text-[var(--km-color-warning)]",
      };
    case "SERVICE_UNAVAILABLE":
    case "TIMEOUT":
      return {
        eyebrow: "Service unavailable",
        title: "Operational data could not be reached",
        symbol: "!",
        iconClass:
          "bg-[var(--km-color-destructive-soft)] text-[var(--km-color-destructive)]",
      };
    case "FORBIDDEN":
    case "UNAUTHORIZED":
      return {
        eyebrow: "Access denied",
        title: "This request is not permitted",
        symbol: "×",
        iconClass:
          "bg-[var(--km-color-destructive-soft)] text-[var(--km-color-destructive)]",
      };
    case "NOT_FOUND":
      return {
        eyebrow: "Not found",
        title: "The requested record is unavailable",
        symbol: "?",
        iconClass:
          "bg-[var(--km-color-muted)] text-[var(--km-color-text-secondary)]",
      };
    default:
      return {
        eyebrow: "Unable to load",
        title: "This view could not be completed",
        symbol: "!",
        iconClass:
          "bg-[var(--km-color-destructive-soft)] text-[var(--km-color-destructive)]",
      };
  }
}
