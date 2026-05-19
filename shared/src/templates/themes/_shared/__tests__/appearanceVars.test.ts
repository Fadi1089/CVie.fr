import { describe, it, expect } from "vitest";
import { buildAppearanceVarsCss } from "../appearanceVars";

describe("buildAppearanceVarsCss — palette", () => {
  it("emits --cv-link when palette.link is set", () => {
    const css = buildAppearanceVarsCss({
      palette: {
        accent: "#ff6d1f",
        link:   "#0095ff",
        ink:    "#202931",
        soft:   "#40484f",
        rule:   "#cccccc",
        canvas: "#ffffff",
      },
    });
    expect(css).toContain("--cv-link: #0095ff;");
  });
});

describe("buildAppearanceVarsCss — text sizes", () => {
  it("emits --cv-text-<role>-delta for each of the 8 roles", () => {
    const css = buildAppearanceVarsCss({
      textSizes: {
        name: 2, label: 1, section: 0.5, title: 0.5,
        card: 0.25, body: 0.5, meta: 0.25, fine: -0.5,
      },
    });
    expect(css).toContain("--cv-text-name-delta: 2pt;");
    expect(css).toContain("--cv-text-label-delta: 1pt;");
    expect(css).toContain("--cv-text-section-delta: 0.5pt;");
    expect(css).toContain("--cv-text-title-delta: 0.5pt;");
    expect(css).toContain("--cv-text-card-delta: 0.25pt;");
    expect(css).toContain("--cv-text-body-delta: 0.5pt;");
    expect(css).toContain("--cv-text-meta-delta: 0.25pt;");
    expect(css).toContain("--cv-text-fine-delta: -0.5pt;");
  });

  it("clamps an out-of-range body delta", () => {
    const css = buildAppearanceVarsCss({ textSizes: { body: 99 } });
    expect(css).toContain("--cv-text-body-delta: 4pt;");
  });
});

describe("buildAppearanceVarsCss — line heights", () => {
  it("emits --cv-lh-<role>-delta for each of the 3 roles", () => {
    const css = buildAppearanceVarsCss({
      lineHeights: { tight: 0.1, snug: -0.05, base: 0.2 },
    });
    expect(css).toContain("--cv-lh-tight-delta: 0.1;");
    expect(css).toContain("--cv-lh-snug-delta: -0.05;");
    expect(css).toContain("--cv-lh-base-delta: 0.2;");
  });
});

describe("buildAppearanceVarsCss — typography", () => {
  it("emits --cv-font-family with the mapped stack", () => {
    const css = buildAppearanceVarsCss({
      typography: { fontFamily: "georgia" },
    });
    expect(css).toContain('--cv-font-family: Georgia,');
  });

  it("emits --cv-letter-spacing in em", () => {
    const css = buildAppearanceVarsCss({
      typography: { letterSpacing: 0.02 },
    });
    expect(css).toContain("--cv-letter-spacing: 0.02em;");
  });
});

describe("buildAppearanceVarsCss — spacing", () => {
  it("no longer accepts lineHeight inside spacing", () => {
    // spacing.lineHeight was removed; the helper must not emit
    // --cv-line-height-delta when only the dead key is passed.
    const css = buildAppearanceVarsCss({
      // @ts-expect-error — intentional probe of old shape
      spacing: { lineHeight: 0.1 },
    });
    expect(css).not.toContain("--cv-line-height-delta");
  });

  it("still emits pageMargin/sectionGap/itemGap", () => {
    const css = buildAppearanceVarsCss({
      spacing: { pageMargin: 2, sectionGap: 1, itemGap: 0.5 },
    });
    expect(css).toContain("--cv-space-page-delta: 2mm;");
    expect(css).toContain("--cv-space-section-delta: 1mm;");
    expect(css).toContain("--cv-space-item-delta: 0.5mm;");
  });
});
