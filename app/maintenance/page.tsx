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
      <div className="rounded-xl border border-[var(--km-color-info)] bg-[var(--km-color-info-soft)] p-4 text-sm text-[var(--km-color-info)]">
        Read and update actions remain unavailable until the maintenance window
        ends. This page intentionally exposes no infrastructure details.
      </div>
      {/* /health is parked (a KitaMo session gets 404). */}
      <Link
        className="mt-6 inline-flex rounded-lg border border-[var(--km-color-border-strong)] bg-white px-4 py-2.5 font-semibold text-[var(--km-color-text)] hover:bg-[var(--km-color-muted)]"
        href="/overview"
        prefetch={false}
      >
        Try again
      </Link>
    </PublicShell>
  );
}
