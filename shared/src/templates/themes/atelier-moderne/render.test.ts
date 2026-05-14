// shared/src/templates/themes/atelier-moderne/render.test.ts
import { describe, it, expect } from "vitest";
import { render } from "./render";
import { sampleResume } from "../../__fixtures__/sampleResume";

const opts = {
  atsMode: "ats-balanced",
  customization: { accent: "rust", density: "comfy", photoShape: "rounded" },
  locale: "fr",
} as const;

describe("atelier-moderne render", () => {
  it("emits a complete HTML document", () => {
    const html = render(sampleResume, opts);
    expect(html).toMatch(/^<!DOCTYPE html>/i);
  });
  it("renders experiences inside cv-section-main", () => {
    const html = render(sampleResume, opts);
    expect(html).toMatch(/<section[^>]*class="cv-section cv-section-main"/);
  });
  it("renders skills inside cv-section-aside", () => {
    const html = render(sampleResume, opts);
    expect(html).toMatch(/<section[^>]*class="cv-section cv-section-aside"/);
  });
  it("forces single-column when atsMode is ats-strict (overrides)", () => {
    const html = render(sampleResume, { ...opts, atsMode: "ats-strict" });
    expect(html).toMatch(/grid-template-columns:\s*1fr\s*!important/);
  });
});
