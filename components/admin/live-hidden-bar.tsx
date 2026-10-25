import { formatNumber } from "@/lib/format";

/**
 * The design pass (Oct 24, Admin Overview): live and hidden businesses as one
 * bar, sized by the counts, with each count in words beside it (never colour
 * alone). With no businesses the track is empty and the line reads 0 (the
 * lead's mkt-adm-14), and the legend keeps "hidden by their owner". The calm
 * segment uses the 3:1 control edge (mkt-adm-11). The bar is decoration; the
 * legend is what is read.
 */
export function LiveHiddenBar({
  live,
  hidden,
}: {
  live: number;
  hidden: number;
}) {
  // With no business at all the empty track gets the 3:1 control edge, so it shows (the lead's review of 84963c8).
  const empty = live + hidden === 0;
  return (
    <div
      className="grid gap-2"
      role="group"
      aria-label="Live and hidden businesses"
    >
      <div
        aria-hidden="true"
        className={`flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-[var(--km-color-muted)] ${
          empty ? "border border-[var(--km-color-control-edge)]" : ""
        }`}
      >
        {live > 0 ? (
          <span
            className="bg-[var(--km-color-action)]"
            style={{ flexGrow: live }}
          />
        ) : null}
        {hidden > 0 ? (
          <span
            className="bg-[var(--km-color-control-edge)]"
            style={{ flexGrow: hidden }}
          />
        ) : null}
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--km-color-text)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full bg-[var(--km-color-action)]"
          />
          {formatNumber(live)} live
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full bg-[var(--km-color-control-edge)]"
          />
          {formatNumber(hidden)} hidden by their owner
        </span>
      </p>
    </div>
  );
}
