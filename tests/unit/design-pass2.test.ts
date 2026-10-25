import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(file, "utf8");

/** The lead's pass-2 review of the Admin design branch (5382ead): the keyboard and full-screen fixes. */
describe("the design pass-2 review fixes", () => {
  it("makes a table box that scrolls sideways a named region in the tab order", () => {
    const box = read("components/ui/table-scroll.tsx");
    expect(box).toContain('role={scrolls ? "region" : undefined}');
    expect(box).toContain("tabIndex={scrolls ? 0 : undefined}");
    expect(box).toContain("aria-label={scrolls ? label : undefined}");
    // The region takes the table's own label.
    expect(read("components/ui/primitives.tsx")).toContain(
      "<TableScroll label={label}>",
    );
  });

  it("makes More a modal dialog: focus moves in, the page behind is inert", () => {
    const tabs = read("components/layout/phone-tabs.tsx");
    expect(tabs).toContain('role="dialog"');
    expect(tabs).toContain('aria-modal="true"');
    expect(tabs).toContain('element.setAttribute("inert", "")');
    expect(tabs).toContain("closeButton.current?.focus()");
    expect(tabs).not.toContain('role="region"');
  });

  it("gives global-error the read-only line and Privacy · Terms, inline", () => {
    const page = read("app/global-error.tsx");
    expect(page).toContain("{READ_ONLY_LINE}");
    expect(page).toContain("href={PRIVACY_URL}");
    expect(page).toContain("href={TERMS_URL}");
    // It replaces the root layout, so it relies on no stylesheet class.
    expect(page).not.toContain("className=");
  });
});

describe("the root 404 keeps its code (the lead, Oct 25, rule 1)", () => {
  it('shows "Error 404" as small text, so support can tell which page someone hit', () => {
    expect(readFileSync("app/not-found.tsx", "utf8")).toContain("Error 404");
    expect(readFileSync("app/error.tsx", "utf8")).toContain(
      'eyebrow="Something went wrong"',
    );
  });
});
