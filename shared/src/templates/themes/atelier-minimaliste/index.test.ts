import { describe, it, expect } from "vitest";
import { atelierMinimaliste } from "./index";

describe("atelierMinimaliste.meta", () => {
  it("has id atelier-minimaliste", () => {
    expect(atelierMinimaliste.meta.id).toBe("atelier-minimaliste");
  });
  it("does NOT support photos", () => {
    expect(atelierMinimaliste.meta.supportsPhoto).toBe(false);
  });
  it("defaults to ats-strict (native)", () => {
    expect(atelierMinimaliste.meta.atsProfile.defaultMode).toBe("ats-strict");
  });
  it("only exposes 'density' as a knob (no accent, no photoShape)", () => {
    const keys = Object.keys(atelierMinimaliste.meta.defaultCustomization);
    expect(keys).toEqual(["density"]);
  });
});
