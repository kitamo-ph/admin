import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { isDevelopmentRoleSwitchingEnabled } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Access denied",
};

export default function AccessDeniedPage() {
  const switchingEnabled = isDevelopmentRoleSwitchingEnabled();

  return (
    <PublicShell
      eyebrow="Access denied"
      title="This area is outside your assigned access"
      description="Your administrator role does not include the capability required for this page. Direct links are checked independently of the navigation."
    >
      <div className="rounded-xl border border-[#eedcae] bg-[#fff7e5] p-4 text-sm text-[#79530d]">
        If this access is necessary for support work, contact a KitaMo super
        administrator. Role changes are not available from this platform.
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          className="rounded-lg bg-[#173f30] px-4 py-2.5 font-semibold text-white hover:bg-[#1e513d]"
          href="/overview"
        >
          Return to overview
        </Link>
        {switchingEnabled ? (
          <Link
            className="rounded-lg border border-[#cbd3cc] bg-white px-4 py-2.5 font-semibold text-[#173f30] hover:bg-[#f0f6f2]"
            href="/sign-in"
          >
            Change development role
          </Link>
        ) : null}
      </div>
    </PublicShell>
  );
}
