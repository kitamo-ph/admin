import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MfaEnrollForm, SignOutButton } from "@/components/auth/mfa-forms";
import { PublicShell } from "@/components/layout/public-shell";
import { requireMfaStep } from "@/lib/auth/kitamo/mfa-state";

export const metadata: Metadata = {
  title: "Set up the authenticator app",
};

export const dynamic = "force-dynamic";

/** Spec §5.1 step 3: no verified TOTP factor yet, so set one up (POST /factors). */
export default async function MfaEnrollPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo: returnToInput } = await searchParams;
  const { factors, returnTo } = await requireMfaStep(returnToInput);
  if (factors.some((factor) => factor.status === "verified")) {
    redirect(`/mfa?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <PublicShell
      eyebrow="Two-step sign-in"
      title="Set up the authenticator app"
      description="The admin site needs a code from an authenticator app at every sign-in. Set it up once on KitaMo's admin account."
    >
      <p className="km-notice mb-5">
        Only for KitaMo&apos;s admin account. A business owner&apos;s account
        cannot use this site; don&apos;t set this up on one.
      </p>
      <MfaEnrollForm returnTo={returnTo} />
      <div className="mt-6">
        <SignOutButton label="Use another account" />
      </div>
    </PublicShell>
  );
}
