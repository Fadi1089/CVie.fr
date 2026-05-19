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
