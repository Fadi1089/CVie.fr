import { describe, it, expect } from "vitest";
import { buildStyles } from "./styles";

describe("atelier-minimaliste styles", () => {
  it("hides the photo entirely", () => {
    expect(buildStyles({ density: "comfy" })).toMatch(/\.cv-photo\s*\{[^}]*display:\s*none/);
  });
  it("imports IBM Plex Sans + Mono only", () => {
    const css = buildStyles({ density: "comfy" });
    expect(css).toMatch(/family=IBM\+Plex\+Sans/);
    expect(css).toMatch(/family=IBM\+Plex\+Mono/);
    expect(css).not.toMatch(/family=Inter/);
    expect(css).not.toMatch(/family=Fraunces/);
  });
  it("applies compact-density CSS variables when density=compact", () => {
    const css = buildStyles({ density: "compact" });
    expect(css).toMatch(/--cv-line-height:\s*1\.32/);
    expect(css).toMatch(/--cv-section-gap:\s*7mm/);
  });
  it("applies comfy-density CSS variables when density=comfy", () => {
    const css = buildStyles({ density: "comfy" });
    expect(css).toMatch(/--cv-line-height:\s*1\.48/);
    expect(css).toMatch(/--cv-section-gap:\s*10mm/);
  });
});
