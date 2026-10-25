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
});
