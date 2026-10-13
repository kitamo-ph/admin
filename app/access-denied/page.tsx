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
      <div className="rounded-xl border border-[var(--km-color-accent)] bg-[var(--km-color-warning-soft)] p-4 text-sm text-[var(--km-color-warning-ink)]">
        If this access is necessary for support work, contact a KitaMo super
        administrator. Role changes are not available from this platform.
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          className="rounded-lg bg-[var(--km-color-action)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--km-color-action-hover)]"
          href="/overview"
          prefetch={false}
        >
          Return to overview
        </Link>
        {switchingEnabled ? (
          <Link
            className="rounded-lg border border-[var(--km-color-border-strong)] bg-white px-4 py-2.5 font-semibold text-[var(--km-color-text)] hover:bg-[var(--km-color-muted)]"
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
