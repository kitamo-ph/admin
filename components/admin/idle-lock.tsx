"use client";

import { useEffect } from "react";

const IDLE_MS = 30 * 60_000;

/**
 * The 30-minute idle lock on the screen (copied from Operations' console,
 * dbe4ca6): no tap, key or scroll for 30 minutes and the site goes to the
 * sign-in. The server enforces the same rule on the next request (proxy and
 * the session check), so a closed laptop is covered too. One local timer,
 * no requests.
 */
export function IdleLock() {
  useEffect(() => {
    let timer = window.setTimeout(lock, IDLE_MS);
    function lock() {
      window.location.replace("/sign-in?why=idle");
    }
    function activity() {
      window.clearTimeout(timer);
      timer = window.setTimeout(lock, IDLE_MS);
    }
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    for (const name of events)
      window.addEventListener(name, activity, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const name of events) window.removeEventListener(name, activity);
    };
  }, []);
  return null;
}
