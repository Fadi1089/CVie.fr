import { describe, it, expect } from "vitest";
import { atsOverridesCss } from "./atsProfile";

describe("atsOverridesCss", () => {
  it("returns the empty string in expressive mode", () => {
    expect(atsOverridesCss("expressive")).toBe("");
  });

  it("strips multi-column layout in ats-strict", () => {
    const css = atsOverridesCss("ats-strict");
    expect(css).toMatch(/column-count:\s*1\s*!important/);
    expect(css).toMatch(/grid-template-columns:\s*1fr\s*!important/);
  });

  it("hides decorative ornaments in ats-strict", () => {
    expect(atsOverridesCss("ats-strict")).toMatch(
      /\[data-decorative\]\s*\{[^}]*display:\s*none/,
    );
  });

  it("hides the photo in ats-strict", () => {
    expect(atsOverridesCss("ats-strict")).toMatch(
      /\.cv-photo\s*\{[^}]*display:\s*none/,
    );
  });

  it("forces black text on white background in ats-strict", () => {
    const css = atsOverridesCss("ats-strict");
    expect(css).toMatch(/color:\s*#000\s*!important/);
    expect(css).toMatch(/background[^;]*:\s*#fff\s*!important/);
  });

  it("ats-balanced keeps photos and accents but removes decorative elements", () => {
    const css = atsOverridesCss("ats-balanced");
    expect(css).not.toMatch(/\.cv-photo\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\[data-decorative\]\s*\{[^}]*display:\s*none/);
  });
});
