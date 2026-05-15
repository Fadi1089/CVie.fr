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

  it("tightens line-height and section-gap in compact density", () => {
    const comfy = buildStyles({ accent: "rust", density: "comfy", photoShape: "rounded" });
    const compact = buildStyles({ accent: "rust", density: "compact", photoShape: "rounded" });
    expect(compact).not.toBe(comfy);
    expect(compact).toMatch(/--cv-line-height:\s*1\.32/);
    expect(comfy).toMatch(/--cv-line-height:\s*1\.5/);
    expect(compact).toMatch(/--cv-section-gap:\s*7mm/);
    expect(comfy).toMatch(/--cv-section-gap:\s*11mm/);
  });
});
