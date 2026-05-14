import { describe, it, expect } from "vitest";
import { render } from "./render";
import { sampleResume } from "../../__fixtures__/sampleResume";

const opts = {
  atsMode: "ats-balanced",
  customization: {
    accent: "oxblood",
    density: "comfy",
    photoShape: "rounded",
  },
  locale: "fr",
} as const;

describe("atelier-classique render", () => {
  it("emits a complete HTML document with a doctype", () => {
    const html = render(sampleResume, opts);
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toMatch(/<\/html>\s*$/i);
  });

  it("renders the candidate's name in the header", () => {
    const html = render(sampleResume, opts);
    expect(html).toContain("Yasmine Benali");
  });

  it("renders every work entry's company and position", () => {
    const html = render(sampleResume, opts);
    expect(html).toContain("Atelier SAS");
    expect(html).toContain("Ingénieure logicielle senior");
    expect(html).toContain("Startup XYZ");
    expect(html).toContain("Développeuse full-stack");
  });

  it("renders highlights as <li> elements", () => {
    const html = render(sampleResume, opts);
    expect(html).toMatch(
      /<li>[^<]*Réduction de 60% de la latence API[^<]*<\/li>/,
    );
  });

  it("renders 'présent' for an open-ended end date", () => {
    const html = render(sampleResume, opts);
    expect(html).toMatch(/mars 2022 — présent/);
  });

  it("escapes HTML in user-provided strings", () => {
    const resume = {
      ...sampleResume,
      basics: { ...sampleResume.basics, name: "Jane <script>" },
    };
    const html = render(resume, opts);
    expect(html).not.toContain("<script>");
    expect(html).toContain("Jane &lt;script&gt;");
  });

  it("inlines the theme CSS and the base print chrome", () => {
    const html = render(sampleResume, opts);
    expect(html).toMatch(/<style[^>]*data-theme=\"atelier-classique\"[^>]*>/);
    expect(html).toMatch(/<style[^>]*data-base[^>]*>/);
  });

  it("refuses to emit photo when image src has a non-image protocol", () => {
    const resume = {
      ...sampleResume,
      basics: { ...sampleResume.basics, image: "javascript:alert(1)" as unknown as string },
    };
    const html = render(resume, opts);
    expect(html).not.toMatch(/class=\"cv-photo\"/);
    expect(html).not.toContain("javascript:");
  });

  it("does NOT include the photo when image is empty", () => {
    const resume = {
      ...sampleResume,
      basics: { ...sampleResume.basics, image: undefined },
    };
    const html = render(resume, opts);
    expect(html).not.toMatch(/class=\"cv-photo\"/);
  });

  it("applies the ATS overrides layer when atsMode is ats-strict", () => {
    const html = render(sampleResume, { ...opts, atsMode: "ats-strict" });
    expect(html).toMatch(/\[data-decorative\]\s*\{[^}]*display:\s*none/);
  });

  it("renders sections in canonical order: experience → education → skills → languages → interests", () => {
    const html = render(sampleResume, opts);
    const expIdx = html.indexOf("Expériences");
    const eduIdx = html.indexOf("Formation");
    const skillIdx = html.indexOf("Compétences");
    const langIdx = html.indexOf("Langues");
    const intIdx = html.indexOf("Centres d'intérêt");
    expect(expIdx).toBeGreaterThan(0);
    expect(expIdx).toBeLessThan(eduIdx);
    expect(eduIdx).toBeLessThan(skillIdx);
    expect(skillIdx).toBeLessThan(langIdx);
    expect(langIdx).toBeLessThan(intIdx);
  });
});
