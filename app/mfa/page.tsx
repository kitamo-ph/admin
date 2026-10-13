import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MfaCodeForm, SignOutButton } from "@/components/auth/mfa-forms";
import { PublicShell } from "@/components/layout/public-shell";
import { requireMfaStep } from "@/lib/auth/kitamo/mfa-state";

export const metadata: Metadata = {
  title: "Authenticator code",
};

export const dynamic = "force-dynamic";

/** Spec §5.1 step 3: with a verified TOTP factor, challenge and verify it. */
export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo: returnToInput } = await searchParams;
  const { factors, returnTo } = await requireMfaStep(returnToInput);
  const verified = factors.find((factor) => factor.status === "verified");
  if (verified === undefined) {
    redirect(`/mfa/enroll?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <PublicShell
      eyebrow="Two-step sign-in"
      title="Enter your authenticator code"
      description="Open the authenticator app on your phone and enter the 6-digit code for KitaMo Admin."
    >
      <MfaCodeForm factorId={verified.id} returnTo={returnTo} />
      <div className="mt-6">
        <SignOutButton label="Use another account" />
      </div>
    </PublicShell>
  );
}
