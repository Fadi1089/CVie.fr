import { describe, expect, it } from "vitest";
import { appearanceSchema } from "./cv";

describe("appearanceSchema sizes", () => {
  it("accepts a fully populated textSizes + mediaSize", () => {
    const parsed = appearanceSchema.safeParse({
      textSizes: { paragraph: 1.5, header: 0, title: -2 },
      mediaSize: 4,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects textSizes outside the allowed range", () => {
    const parsed = appearanceSchema.safeParse({
      textSizes: { paragraph: 99 },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects mediaSize outside the allowed range", () => {
    const parsed = appearanceSchema.safeParse({ mediaSize: 50 });
    expect(parsed.success).toBe(false);
  });

  it("treats sizes as optional (back-compat)", () => {
    const parsed = appearanceSchema.safeParse({});
    expect(parsed.success).toBe(true);
  });
});

describe("appearanceSchema spacing", () => {
  it("accepts a fully populated spacing object", () => {
    const parsed = appearanceSchema.safeParse({
      spacing: { pageMargin: 2, sectionGap: -1, itemGap: 3, lineHeight: 0.1 },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects out-of-range pageMargin", () => {
    const parsed = appearanceSchema.safeParse({
      spacing: { pageMargin: 99 },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects out-of-range lineHeight", () => {
    const parsed = appearanceSchema.safeParse({
      spacing: { lineHeight: 1.5 },
    });
    expect(parsed.success).toBe(false);
  });

  it("treats spacing as optional and accepts partial spacing object", () => {
    const emptyParsed = appearanceSchema.safeParse({});
    expect(emptyParsed.success).toBe(true);

    const partialParsed = appearanceSchema.safeParse({
      spacing: { itemGap: 1 },
    });
    expect(partialParsed.success).toBe(true);
  });
});
