// shared/src/templates/themes/atelier-moderne/styles.test.ts
import { describe, it, expect } from "vitest";
import { buildStyles } from "./styles";

describe("atelier-moderne styles", () => {
  it("declares a two-column main grid", () => {
    const css = buildStyles({ accent: "rust", density: "comfy", photoShape: "rounded" });
    expect(css).toMatch(/grid-template-columns:\s*32%\s*68%/);
  });
  it("uses Newsreader as the display font", () => {
    const css = buildStyles({ accent: "rust", density: "comfy", photoShape: "rounded" });
    expect(css).toMatch(/family=Newsreader/);
  });
  it("uses rust accent for the 'rust' value", () => {
    const css = buildStyles({ accent: "rust", density: "comfy", photoShape: "rounded" });
    expect(css).toMatch(/--cv-accent:\s*#B14E2A/i);
  });
});
