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
