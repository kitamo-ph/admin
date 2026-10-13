"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      aria-label={`${label}: ${value}`}
      className="rounded-md border border-[var(--km-color-border)] bg-white px-2 py-1 text-[0.7rem] font-semibold text-[var(--km-color-select)] hover:bg-[var(--km-color-muted)]"
      onClick={copy}
      type="button"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
