import { describe, it, expect } from "vitest";
import { paletteSchema, appearanceSchema } from "../cv";

describe("paletteSchema", () => {
  it("requires all 6 channels including link", () => {
    const ok = paletteSchema.safeParse({
      accent: "#ff6d1f",
      link:   "#0095ff",
      ink:    "#202931",
      soft:   "#40484f",
      rule:   "#cccccc",
      canvas: "#ffffff",
    });
    expect(ok.success).toBe(true);
  });

  it("rejects a palette missing link", () => {
    const ko = paletteSchema.safeParse({
      accent: "#ff6d1f",
      ink:    "#202931",
      soft:   "#40484f",
      rule:   "#cccccc",
      canvas: "#ffffff",
    });
    expect(ko.success).toBe(false);
  });
});

describe("textSizesSchema (via appearanceSchema)", () => {
  it("accepts all 8 new roles", () => {
    const ok = appearanceSchema.safeParse({
      textSizes: {
        name: 2, label: 1, section: 0.5, title: 1,
        card: 0.75, body: 0.5, meta: 0.25, fine: 0.5,
      },
    });
    expect(ok.success).toBe(true);
  });

  it("rejects out-of-range body delta", () => {
    const ko = appearanceSchema.safeParse({ textSizes: { body: 99 } });
    expect(ko.success).toBe(false);
  });

  it("allows partial textSizes (every role optional)", () => {
    const ok = appearanceSchema.safeParse({ textSizes: { name: 1 } });
    expect(ok.success).toBe(true);
  });
});

describe("lineHeightsSchema (via appearanceSchema)", () => {
  it("accepts all three roles", () => {
    const ok = appearanceSchema.safeParse({
      lineHeights: { tight: 0.1, snug: -0.05, base: 0.2 },
    });
    expect(ok.success).toBe(true);
  });

  it("rejects out-of-range tight", () => {
    const ko = appearanceSchema.safeParse({ lineHeights: { tight: 1 } });
    expect(ko.success).toBe(false);
  });
});

describe("spacingSchema (post-rewrite)", () => {
  it("drops lineHeight as an accepted key", () => {
    const r = appearanceSchema.safeParse({ spacing: { lineHeight: 0.1 } });
    // Strict-strip means the parse succeeds but the key is gone; we assert
    // the slot is empty rather than checking failure.
    expect(r.success).toBe(true);
    if (r.success) {
      // appearanceSchema strips lineHeight from spacing if present.
      expect((r.data.spacing as Record<string, unknown> | undefined)?.lineHeight)
        .toBeUndefined();
    }
  });

  it("still accepts the three remaining spacing fields", () => {
    const ok = appearanceSchema.safeParse({
      spacing: { pageMargin: 2, sectionGap: 1, itemGap: 0.5 },
    });
    expect(ok.success).toBe(true);
  });
});

describe("typographySchema (via appearanceSchema)", () => {
  it("accepts all four font families", () => {
    for (const ff of ["helvetica-neue", "inter", "georgia", "ibm-plex-sans"]) {
      const ok = appearanceSchema.safeParse({ typography: { fontFamily: ff } });
      expect(ok.success).toBe(true);
    }
  });

  it("rejects an unknown font family", () => {
    const ko = appearanceSchema.safeParse({
      typography: { fontFamily: "comic-sans" },
    });
    expect(ko.success).toBe(false);
  });

  it("accepts letterSpacing in range", () => {
    const ok = appearanceSchema.safeParse({
      typography: { letterSpacing: 0.02 },
    });
    expect(ok.success).toBe(true);
  });

  it("rejects letterSpacing out of range", () => {
    const ko = appearanceSchema.safeParse({
      typography: { letterSpacing: 0.5 },
    });
    expect(ko.success).toBe(false);
  });
});
