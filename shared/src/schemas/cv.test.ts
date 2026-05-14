import { describe, expect, it } from "vitest";
import { appearanceSchema, cvDataSchema } from "./cv";

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

const minimal = {
  personalInfo: { firstName: "X", lastName: "Y" },
};

describe("cvDataSchema themeId + customization", () => {
  it("defaults themeId to 'atelier-classique' when omitted", () => {
    const parsed = cvDataSchema.parse(minimal);
    expect(parsed.themeId).toBe("atelier-classique");
  });
  it("defaults customization to an empty object when omitted", () => {
    const parsed = cvDataSchema.parse(minimal);
    expect(parsed.customization).toEqual({});
  });
  it("accepts an arbitrary themeId string (validated against registry server-side)", () => {
    const parsed = cvDataSchema.parse({ ...minimal, themeId: "atelier-moderne" });
    expect(parsed.themeId).toBe("atelier-moderne");
  });
  it("accepts a record of unknown values for customization", () => {
    const parsed = cvDataSchema.parse({
      ...minimal,
      customization: { accent: "oxblood", density: "comfy" },
    });
    expect(parsed.customization.accent).toBe("oxblood");
  });
  it("rejects an oversized themeId", () => {
    expect(() =>
      cvDataSchema.parse({ ...minimal, themeId: "x".repeat(65) }),
    ).toThrow();
  });
});
