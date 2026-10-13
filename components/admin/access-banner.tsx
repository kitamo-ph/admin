"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import {
  LEVEL_LABELS,
  REASON_LABELS,
  minutesLeft,
} from "@/lib/admin/r16-rules";
import type { LiveAccess } from "@/lib/admin/r16-schemas";

const TICK_MS = 15_000;

/** A local clock in 15-second steps: one interval, no request (no polling). */
function subscribe(onTick: () => void): () => void {
  const timer = window.setInterval(onTick, TICK_MS);
  return () => window.clearInterval(timer);
}
// Rounded up, so the banner never shows more time than is left.
const clockSnapshot = () => Math.ceil(Date.now() / TICK_MS) * TICK_MS;
/** On the server (and while hydrating) the minutes are not shown yet. */
const serverSnapshot = () => null;

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
  const now = useSyncExternalStore(subscribe, clockSnapshot, serverSnapshot);

  if (accesses.length === 0) return null;

  return (
    <section aria-label="Open accesses" className="km-banner-stack">
      {accesses.map((access) => {
        // Before the browser's clock is read, treat the access as open.
        const left = now === null ? 1 : minutesLeft(access.expiresAt, now);
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
                <strong>{now === null ? "open" : `${left} min left`}</strong>
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
