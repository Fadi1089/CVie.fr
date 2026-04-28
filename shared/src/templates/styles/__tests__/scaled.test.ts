import { describe, expect, it } from "vitest";
import { s, sText, sMedia, sSpace, sLine } from "../_scaled";

describe("scale helpers", () => {
  it("s() emits density-only calc()", () => {
    expect(s(10, "pt")).toBe("calc(10pt * var(--cv-scale, 1))");
  });

  it("sText() adds a per-role delta term", () => {
    expect(sText(10, "pt", "paragraph")).toBe(
      "calc(10pt * var(--cv-scale, 1) + var(--cv-text-paragraph-delta, 0pt))",
    );
    expect(sText(24, "pt", "title")).toBe(
      "calc(24pt * var(--cv-scale, 1) + var(--cv-text-title-delta, 0pt))",
    );
    expect(sText(15, "pt", "header")).toBe(
      "calc(15pt * var(--cv-scale, 1) + var(--cv-text-header-delta, 0pt))",
    );
  });

  it("sMedia() adds the media delta term", () => {
    expect(sMedia(28, "mm")).toBe(
      "calc(28mm * var(--cv-scale, 1) + var(--cv-media-delta, 0mm))",
    );
  });

  it("sSpace() adds a per-role spacing delta term", () => {
    expect(sSpace(2.6458, "mm", "item")).toBe(
      "calc(2.6458mm * var(--cv-scale, 1) + var(--cv-space-item-delta, 0mm))",
    );
    expect(sSpace(5.2917, "mm", "section")).toBe(
      "calc(5.2917mm * var(--cv-scale, 1) + var(--cv-space-section-delta, 0mm))",
    );
    expect(sSpace(14, "mm", "page")).toBe(
      "calc(14mm * var(--cv-scale, 1) + var(--cv-space-page-delta, 0mm))",
    );
  });

  it("sLine() emits a unitless additive delta", () => {
    expect(sLine(1.5)).toBe("calc(1.5 + var(--cv-line-height-delta, 0))");
  });
});
