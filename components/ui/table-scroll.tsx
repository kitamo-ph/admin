"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The scroll cue for a wide table (the lead's review of 84963c8: a table cut on a column edge looked complete).
 * While columns are hidden to the right, a fade on that edge and "Scroll for more →" under the table. The
 * table's parent stays the scroll box (the responsive e2e checks it), and nothing is measured on the server.
 */
export function TableScroll({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const element = box.current;
    if (element === null) return;
    const update = () =>
      setMore(
        element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
      );
    // The first observation arrives on its own after observe(); fonts loading resize the table, not the box.
    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    element.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <>
      <div className="relative">
        <div className="table-scroll" ref={box}>
          {children}
        </div>
        {more ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-12"
            style={{
              background:
                "linear-gradient(to left, var(--km-color-surface), transparent)",
            }}
          />
        ) : null}
      </div>
      {more ? (
        <p
          aria-hidden="true"
          className="km-panel-x pt-2 pb-1 text-right text-xs font-semibold text-[var(--km-color-text-secondary)]"
        >
          Scroll for more →
        </p>
      ) : null}
    </>
  );
}
