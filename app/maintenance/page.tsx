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
      readOnlyLine
      title="Administrative tools are temporarily paused"
      description="The operational data source is in a controlled maintenance window. Merchant activity in the Android application is not changed by this admin-platform state."
    >
      <div className="rounded-xl bg-[var(--km-color-info-soft)] px-3.5 py-3 text-sm leading-[1.45] text-[var(--km-color-info)]">
        Read and update actions remain unavailable until the maintenance window
        ends. This page intentionally exposes no infrastructure details.
      </div>
      {/* /health is parked (a KitaMo session gets 404). */}
      {/* The canvas: the state's one action is the primary capsule (was a white outlined button). */}
      <Link
        className="km-button mt-6 min-h-14 w-full"
        href="/overview"
        prefetch={false}
      >
        Try again
      </Link>
    </PublicShell>
  );
}
