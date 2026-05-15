import { describe, it, expect } from "vitest";
import { atelierClassique } from "./index";

describe("atelierClassique.meta", () => {
  it("is identified by 'atelier-classique'", () => {
    expect(atelierClassique.meta.id).toBe("atelier-classique");
  });
  it("is in the free tier", () => {
    expect(atelierClassique.meta.tier).toBe("free");
  });
  it("supports ats-strict as its narrowest mode", () => {
    expect(atelierClassique.meta.atsProfile.minSupported).toBe("ats-strict");
    expect(atelierClassique.meta.atsProfile.defaultMode).toBe("ats-balanced");
  });
  it("declares photo support", () => {
    expect(atelierClassique.meta.supportsPhoto).toBe(true);
  });
});

describe("atelierClassique.meta.customizationSchema", () => {
  it("accepts the default customization", () => {
    const ok = atelierClassique.meta.customizationSchema.safeParse(
      atelierClassique.meta.defaultCustomization,
    );
    expect(ok.success).toBe(true);
  });
  it("rejects unknown accent values (controlled palette only)", () => {
    const bad = atelierClassique.meta.customizationSchema.safeParse({
      accent: "#000000",
      density: "comfy",
      photoShape: "circle",
    });
    expect(bad.success).toBe(false);
  });
  it("rejects unknown density values", () => {
    const bad = atelierClassique.meta.customizationSchema.safeParse({
      accent: "oxblood",
      density: "spacious-extra-large",
      photoShape: "circle",
    });
    expect(bad.success).toBe(false);
  });
});
