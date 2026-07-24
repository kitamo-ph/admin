import Link from "next/link";

import { Panel } from "@/components/ui/primitives";

type ServiceErrorShape = {
  code: string;
  message: string;
  correlationId: string;
  retryable: boolean;
};

export function ServiceErrorState({
  error,
}: {
  error: ServiceErrorShape;
}) {
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
          <p className="text-xs font-bold tracking-[0.12em] text-[#69736d] uppercase">
            {state.eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#173f30]">
            {state.title}
          </h2>
          <p className="mt-3 leading-6 text-[#69736d]">{error.message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {error.retryable ? (
              <Link
                className="rounded-lg bg-[#173f30] px-4 py-2.5 font-semibold text-white hover:bg-[#1e513d]"
                href=""
              >
                Try again
              </Link>
            ) : null}
            <Link
              className="rounded-lg border border-[#cbd3cc] bg-white px-4 py-2.5 font-semibold text-[#173f30] hover:bg-[#f0f6f2]"
              href="/health"
            >
              View system health
            </Link>
          </div>
          <p className="mt-6 text-xs text-[#8a928d]">
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
        stale ? "font-semibold text-[#79530d]" : "text-[#69736d]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          stale ? "bg-[#b98621]" : "bg-[#28734f]"
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
        iconClass: "bg-[#fbf0d5] text-[#8a6115]",
      };
    case "SERVICE_UNAVAILABLE":
    case "TIMEOUT":
      return {
        eyebrow: "Service unavailable",
        title: "Operational data could not be reached",
        symbol: "!",
        iconClass: "bg-[#f9e7e4] text-[#a53b31]",
      };
    case "FORBIDDEN":
    case "UNAUTHORIZED":
      return {
        eyebrow: "Access denied",
        title: "This request is not permitted",
        symbol: "×",
        iconClass: "bg-[#f9e7e4] text-[#a53b31]",
      };
    case "NOT_FOUND":
      return {
        eyebrow: "Not found",
        title: "The requested record is unavailable",
        symbol: "?",
        iconClass: "bg-[#f4f5f2] text-[#59625c]",
      };
    default:
      return {
        eyebrow: "Unable to load",
        title: "This view could not be completed",
        symbol: "!",
        iconClass: "bg-[#f9e7e4] text-[#a53b31]",
      };
  }
}
