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
      title="Operational data cannot be reached right now"
      description="The request failed safely before any administrative change was made. Try again after a short wait."
    >
      <div className="rounded-xl border border-[#edcfca] bg-[#fdf0ee] p-4 text-sm text-[#92342b]">
        No merchant records or support reports were changed. Detailed failure
        information is withheld from this public state.
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          className="rounded-lg bg-[#173f30] px-4 py-2.5 font-semibold text-white hover:bg-[#1e513d]"
          href="/overview"
        >
          Try overview again
        </Link>
        <Link
          className="rounded-lg border border-[#cbd3cc] bg-white px-4 py-2.5 font-semibold text-[#173f30] hover:bg-[#f0f6f2]"
          href="/health"
        >
          View health status
        </Link>
      </div>
    </PublicShell>
  );
}
