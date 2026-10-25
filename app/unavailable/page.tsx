import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";

export const metadata: Metadata = {
  title: "Service unavailable",
};

export default function UnavailablePage() {
  return (
    <PublicShell
      eyebrow="Service unavailable"
      readOnlyLine
      title="Operational data cannot be reached right now"
      description="The request failed safely before any administrative change was made. Try again after a short wait."
    >
      {/* The design pass (Oct 24): grey, not red: nothing was changed, so it is no error of the admin's. Same words. */}
      <div className="rounded-xl bg-[var(--km-color-muted)] px-3.5 py-3 text-sm leading-[1.45] text-[var(--km-color-text)]">
        No merchant records or support reports were changed. Detailed failure
        information is withheld from this public state.
      </div>
      <div className="mt-6 grid gap-3">
        <Link className="km-button min-h-14" href="/overview" prefetch={false}>
          Try overview again
        </Link>
      </div>
    </PublicShell>
  );
}
