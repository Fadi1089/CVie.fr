import { describe, it, expect } from "vitest";
import { render } from "./render";
import { sampleResume } from "../../__fixtures__/sampleResume";

const opts = {
  atsMode: "ats-strict",
  customization: { density: "comfy" },
  locale: "fr",
} as const;

describe("atelier-minimaliste render", () => {
  it("emits a complete HTML document", () => {
    const html = render(sampleResume, opts);
    expect(html).toMatch(/^<!DOCTYPE html>/i);
  });

  it("emits no <img> tag (no photo by design)", () => {
    const html = render(sampleResume, opts);
    expect(html).not.toMatch(/<img/i);
  });

  it("escapes HTML in user-provided strings (XSS regression)", () => {
    const resume = {
      ...sampleResume,
      basics: { ...sampleResume.basics, name: '<script>alert("xss")</script>' },
    };
    const html = render(resume, opts);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
