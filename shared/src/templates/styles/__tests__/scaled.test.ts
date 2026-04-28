import { describe, expect, it } from "vitest";
import { s, sText, sMedia } from "../_scaled";

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
});
