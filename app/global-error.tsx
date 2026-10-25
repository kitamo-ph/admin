"use client";

import { PRIVACY_URL, TERMS_URL } from "@/components/layout/legal-links";
import { READ_ONLY_LINE } from "@/components/layout/read-only-line";

/*
 * The root layout itself failed: Next replaces it with this document, which may load neither globals.css nor
 * the tokens, so every style here is inline (the tokens' light values). The lead's pass-2 review: like every
 * other full-screen state, the read-only line (mkt-adm-01, word for word), the canvas's plain state (a 420 px
 * column, a 30 px title, a full-width 56 px capsule) and Privacy · Terms (R21) as 44 px links. Same words.
 */
const TEXT = "#17181a";
const SECONDARY = "#686b70";
const ACTION = "#0a7a40";
const FONT =
  '"Schibsted Grotesk", "Segoe UI", Roboto, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

const smallCaps = {
  margin: 0,
  color: SECONDARY,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  lineHeight: 1.35,
  textTransform: "uppercase",
} as const;

const legalLink = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 44,
  padding: "0 4px",
  color: SECONDARY,
  textDecoration: "underline",
  textUnderlineOffset: 2,
} as const;

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#ffffff",
          color: TEXT,
          fontFamily: FONT,
          fontSize: 15,
          lineHeight: 1.5,
        }}
      >
        <main
          style={{
            display: "grid",
            minHeight: "100vh",
            placeItems: "center",
            padding: "56px 20px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ width: "100%", maxWidth: 420 }}>
            <p
              style={{
                ...smallCaps,
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 24,
              }}
            >
              <svg
                aria-hidden="true"
                fill="none"
                height="14"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.25"
                style={{ flexShrink: 0 }}
                viewBox="0 0 24 24"
                width="14"
              >
                <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
              </svg>
              {READ_ONLY_LINE}
            </p>
            <p style={{ ...smallCaps, letterSpacing: "0.08em" }}>
              KitaMo Admin
            </p>
            <h1
              style={{
                margin: "8px 0 0",
                color: TEXT,
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
              }}
            >
              The application needs to reload
            </h1>
            <p
              style={{
                margin: "8px 0 0",
                color: SECONDARY,
                fontSize: 15,
                lineHeight: 1.45,
              }}
            >
              An unexpected application error occurred. No operational changes
              were made.
            </p>
            <button
              onClick={reset}
              style={{
                width: "100%",
                minHeight: 56,
                marginTop: 24,
                border: 0,
                borderRadius: 999,
                background: ACTION,
                color: "#ffffff",
                font: `600 17px/1.2 ${FONT}`,
                cursor: "pointer",
              }}
              type="button"
            >
              Reload application
            </button>
            <p style={{ margin: "32px 0 0 -4px", color: SECONDARY }}>
              <a href={PRIVACY_URL} style={legalLink}>
                Privacy
              </a>
              {" · "}
              <a href={TERMS_URL} style={legalLink}>
                Terms
              </a>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
