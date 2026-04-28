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
