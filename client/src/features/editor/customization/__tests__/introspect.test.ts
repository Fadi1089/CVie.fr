import { describe, it, expect } from "vitest";
import { z } from "zod";
import { introspectCustomizationSchema } from "../introspect";

describe("introspectCustomizationSchema", () => {
  it("extracts enum choices as a radio control", () => {
    const schema = z.object({ accent: z.enum(["oxblood", "encre", "sapin"]) });
    const controls = introspectCustomizationSchema(schema);
    expect(controls).toEqual([
      { key: "accent", kind: "radio", choices: ["oxblood", "encre", "sapin"] },
    ]);
  });

  it("returns 'unknown' for unsupported schema shapes (no crash)", () => {
    const schema = z.object({ x: z.number() });
    expect(introspectCustomizationSchema(schema)).toEqual([
      { key: "x", kind: "unknown" },
    ]);
  });
});
