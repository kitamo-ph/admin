import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";

export const metadata: Metadata = {
  title: "Maintenance",
};

export default function MaintenancePage() {
  return (
    <PublicShell
      eyebrow="Planned maintenance"
      title="Administrative tools are temporarily paused"
      description="The operational data source is in a controlled maintenance window. Merchant activity in the Android application is not changed by this admin-platform state."
    >
      <div className="rounded-xl border border-[#cddde9] bg-[#edf4f8] p-4 text-sm text-[#315f81]">
        Read and update actions remain unavailable until the maintenance window
        ends. This page intentionally exposes no infrastructure details.
      </div>
      <Link
        className="mt-6 inline-flex rounded-lg border border-[#cbd3cc] bg-white px-4 py-2.5 font-semibold text-[#173f30] hover:bg-[#f0f6f2]"
        href="/health"
      >
        Check system health
      </Link>
    </PublicShell>
  );
}
