import type { Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/mfa-forms";
import { PublicShell } from "@/components/layout/public-shell";
import { isDevelopmentRoleSwitchingEnabled } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Access denied",
};

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ why?: string }>;
}) {
  const { why } = await searchParams;
  const switchingEnabled = isDevelopmentRoleSwitchingEnabled();

  if (why === "not_permitted") {
    // Core's KM005, the one answer for every refusal (spec §3.2): this site
    // never learns which reason applied, so it names them all.
    return (
      <PublicShell
        eyebrow="Not permitted"
        title="Not permitted"
        description="KitaMo did not let this account use the admin site."
      >
        <div className="km-notice">
          <p>This happens when any of these is true:</p>
          <ul className="mt-2 list-disc pl-5">
            <li>the account is not KitaMo&apos;s admin account;</li>
            <li>the account owns or manages a business;</li>
            <li>the admin site is switched off for now.</li>
          </ul>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <SignOutButton label="Sign out" className="km-button" />
        </div>
      </PublicShell>
    );
  }

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
          prefetch={false}
        >
          Return to overview
        </Link>
        {switchingEnabled ? (
          <Link
            className="rounded-lg border border-[#cbd3cc] bg-white px-4 py-2.5 font-semibold text-[#173f30] hover:bg-[#f0f6f2]"
            href="/sign-in"
            prefetch={false}
          >
            Change development role
          </Link>
        ) : null}
      </div>
    </PublicShell>
  );
}
