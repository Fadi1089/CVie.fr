import { describe, it, expect } from "vitest";
import { buildStyles } from "./styles";

describe("buildStyles", () => {
  it("returns CSS that includes the @page rule (A4)", () => {
    const css = buildStyles({
      accent: "oxblood",
      density: "comfy",
      photoShape: "rounded",
    });
    expect(css).toMatch(/@page\s*\{[^}]*size:\s*A4/);
  });

  it("injects the resolved accent color for 'oxblood'", () => {
    const css = buildStyles({
      accent: "oxblood",
      density: "comfy",
      photoShape: "rounded",
    });
    expect(css).toMatch(/--cv-accent:\s*#7B2D26/i);
  });

  it("injects a different accent for 'sapin'", () => {
    const css = buildStyles({
      accent: "sapin",
      density: "comfy",
      photoShape: "rounded",
    });
    expect(css).toMatch(/--cv-accent:\s*#2E4A3A/i);
  });

  it("tightens line-height in compact density", () => {
    const comfy = buildStyles({
      accent: "oxblood",
      density: "comfy",
      photoShape: "rounded",
    });
    const compact = buildStyles({
      accent: "oxblood",
      density: "compact",
      photoShape: "rounded",
    });
    expect(compact).not.toBe(comfy);
    expect(compact).toMatch(/--cv-line-height:\s*1\.3/);
    expect(comfy).toMatch(/--cv-line-height:\s*1\.5/);
  });

  it("circles the photo in photoShape:circle", () => {
    const css = buildStyles({
      accent: "oxblood",
      density: "comfy",
      photoShape: "circle",
    });
    expect(css).toMatch(/\.cv-photo\s*\{[^}]*border-radius:\s*50%/);
  });

  it("imports only the two Google Fonts the theme declares (Fraunces + Bricolage)", () => {
    const css = buildStyles({
      accent: "oxblood",
      density: "comfy",
      photoShape: "rounded",
    });
    expect(css).toMatch(/family=Fraunces/);
    expect(css).toMatch(/family=Bricolage\+Grotesque/);
    expect(css).not.toMatch(/family=Inter/);
  });
});
