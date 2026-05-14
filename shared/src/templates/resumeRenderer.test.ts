import { describe, it, expect } from "vitest";
import { renderResumeHtml } from "./resumeRenderer";
import { sampleCv } from "./__fixtures__/sampleCv";

describe("renderResumeHtml", () => {
  it("delegates to the named theme and returns HTML", () => {
    const html = renderResumeHtml(sampleCv, {
      themeId: "atelier-classique",
      atsMode: "ats-balanced",
      customization: {
        accent: "oxblood",
        density: "comfy",
        photoShape: "rounded",
      },
    });
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toContain("Yasmine Benali");
  });

  it("throws on an unknown themeId", () => {
    expect(() =>
      renderResumeHtml(sampleCv, {
        themeId: "ghost-theme",
        atsMode: "ats-balanced",
        customization: {},
      }),
    ).toThrow(/unknown theme/i);
  });

  it("falls back to the theme's default customization when given an empty object", () => {
    const html = renderResumeHtml(sampleCv, {
      themeId: "atelier-classique",
      atsMode: "ats-balanced",
      customization: {},
    });
    expect(html).toMatch(/--cv-accent:\s*#7B2D26/i); // oxblood = default
  });

  it("rejects customization that fails the theme's schema", () => {
    expect(() =>
      renderResumeHtml(sampleCv, {
        themeId: "atelier-classique",
        atsMode: "ats-balanced",
        customization: { accent: "neon-pink" }, // not in enum
      }),
    ).toThrow(/customization/i);
  });

  it("honours the locale from cv.appearance", () => {
    const html = renderResumeHtml(
      { ...sampleCv, appearance: { locale: "en" } },
      {
        themeId: "atelier-classique",
        atsMode: "ats-balanced",
        customization: {},
      },
    );
    expect(html).toContain("Experience");
  });
});
