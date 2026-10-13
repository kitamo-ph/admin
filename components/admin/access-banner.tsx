"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  LEVEL_LABELS,
  REASON_LABELS,
  minutesLeft,
} from "@/lib/admin/r16-rules";
import type { LiveAccess } from "@/lib/admin/r16-schemas";

/**
 * The 30-minute banner (spec §5.3, D27 §4.2), from km_admin_session. The
 * minutes tick on a local clock only: no request, no polling (Vercel Hobby).
 * At 0 it says the access ended; Core has already stopped answering it.
 */
export function AccessBanner({
  accesses,
  closeRequestIds,
  closeAction,
}: {
  accesses: LiveAccess[];
  /** One fresh idempotency key per access, minted on the server. */
  closeRequestIds: Record<string, string>;
  closeAction: (formData: FormData) => Promise<void>;
}) {
  const pathname = usePathname();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  if (accesses.length === 0) return null;

  return (
    <section aria-label="Open accesses" className="km-banner-stack">
      {accesses.map((access) => {
        const left = minutesLeft(access.expiresAt, now);
        const name = access.businessName ?? "A deleted business";
        return (
          <div
            className={left > 0 ? "km-banner" : "km-banner km-banner-ended"}
            data-testid="access-banner"
            key={access.accessId}
            role="status"
          >
            {left > 0 ? (
              <p>
                You&apos;re viewing <strong>{name}</strong> ·{" "}
                {LEVEL_LABELS[access.level]} · reason:{" "}
                {REASON_LABELS[access.reasonCode]} ·{" "}
                <strong>{left} min left</strong>
              </p>
            ) : (
              <p>
                <strong>This access ended.</strong> Open a new one with a
                reason.
              </p>
            )}
            {left > 0 ? (
              <form action={closeAction}>
                <input name="accessId" type="hidden" value={access.accessId} />
                <input
                  name="requestId"
                  type="hidden"
                  value={closeRequestIds[access.accessId] ?? ""}
                />
                <input name="returnTo" type="hidden" value={pathname} />
                <button
                  className="km-button-secondary km-button-small"
                  type="submit"
                >
                  Close<span className="sr-only"> access to {name}</span>
                </button>
              </form>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
