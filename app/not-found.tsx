import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";

/**
 * An unmatched address (a missing view inside a signed-in session renders in the shell: app/(admin)/not-found.tsx).
 * The lead's pass-2 review: on PublicShell, as Unavailable and Maintenance are (the canvas's 420 px column, a
 * full-width 56 px capsule, no shadowed card), with the read-only line and Privacy · Terms. Same words.
 */
export default function NotFound() {
  return (
    <PublicShell
      description="Check the address or return to the operational overview."
      eyebrow="Page not found"
      readOnlyLine
      title="That admin view does not exist"
    >
      <Link
        className="km-button min-h-14 w-full"
        href="/overview"
        prefetch={false}
      >
        Go to overview
      </Link>
    </PublicShell>
  );
}
