import { describe, expect, it } from "vitest";
import { sampleCv } from "../cv/defaults";
import { cvDataSchema } from "../schemas/cv";
import type { CvData } from "../types/cv";
import { classiqueCss } from "./styles/classique";
import {
  escapeHtml,
  formatMonth,
  renderCvHtml,
  safeHttpUrl,
  safeImageUrl,
} from "./renderer";

describe("renderCvHtml", () => {
  it("returns a complete HTML document starting with <!DOCTYPE html>", () => {
    const html = renderCvHtml(sampleCv, "classique");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toMatch(/<html lang="fr"[^>]*>/);
    expect(html).toContain("</html>");
  });

  it("bakes the default overflow mode into the .cv-paginated class", () => {
    const html = renderCvHtml(sampleCv, "classique");
    expect(html).toContain('class="cv-paginated cv-overflow-section"');
    expect(html).toContain("break-inside: avoid");
  });

  it("switches the overflow class when the element mode is requested", () => {
    const html = renderCvHtml(sampleCv, "classique", 1, "element");
    expect(html).toContain('class="cv-paginated cv-overflow-element"');
    expect(html).not.toContain('class="cv-paginated cv-overflow-section"');
  });

  it("contains all 5 French section headings", () => {
    const html = renderCvHtml(sampleCv, "classique");
    expect(html).toContain("<h2>Formations</h2>");
    expect(html).toContain("<h2>Expériences Professionnelles</h2>");
    expect(html).toContain("<h2>Compétences</h2>");
    expect(html).toContain("<h2>Langues</h2>");
    expect(html).toContain("<h2>Centres d'Intérêt</h2>");
  });

  it("omits sections that have no entries", () => {
    const emptyCv: CvData = {
      ...sampleCv,
      formations: [],
      experiences: [],
    };
    const html = renderCvHtml(emptyCv, "classique");
    expect(html).not.toContain("<h2>Formations</h2>");
    expect(html).not.toContain("<h2>Expériences Professionnelles</h2>");
    // sections present in fixture should still render
    expect(html).toContain("<h2>Compétences</h2>");
  });

  it("embeds the template CSS scoped under .cv / .cv-canvas / .cv-paginated", () => {
    const html = renderCvHtml(sampleCv, "classique");
    expect(html).toContain("<style>");
    expect(html).toContain(".cv {");
    expect(html).toContain(".cv section h2");
    // Canvas/paginated wrapper styles are scoped — no bare `body`, `html`, `*` selectors.
    expect(html).not.toMatch(/\n\s*body\s*\{/);
    expect(html).not.toMatch(/\n\s*html\s*\{/);
    expect(html).not.toMatch(/\n\s*\*\s*\{/);
  });

  it("uses semantic HTML structure", () => {
    const html = renderCvHtml(sampleCv, "classique");
    expect(html).toContain('<article class="cv">');
    expect(html).toMatch(/<header(?:\s|>)/);
    expect(html).toMatch(/<section(?:\s|>)/);
    expect(html).toMatch(/<h1(?:\s|>)/);
    expect(html).toMatch(/<h2(?:\s|>)/);
    expect(html).toMatch(/<h3(?:\s|>)/);
  });

  it("adds editor section anchors for preview-to-form navigation", () => {
    const html = renderCvHtml(sampleCv, "classique");
    expect(html).toContain('data-editor-section="personalInfo"');
    expect(html).toContain('data-editor-section="formations"');
    expect(html).toContain('data-editor-section="experiences"');
    expect(html).toContain('data-editor-section="skills"');
    expect(html).toContain('data-editor-section="languages"');
    expect(html).toContain('data-editor-section="interests"');
    expect(html).toContain("cv-section-click");
  });

  it("adds editor item anchors for per-entry navigation", () => {
    const html = renderCvHtml(sampleCv, "classique");
    expect(html).toContain('data-editor-item-id="');
  });

  it("renders the profile photo when photoUrl is set", () => {
    const html = renderCvHtml(sampleCv, "classique");
    expect(html).toContain('<header data-editor-section="personalInfo" class="has-photo">');
    expect(html).toContain('<img class="photo"');
    expect(html).toContain(`src="${sampleCv.personalInfo.photoUrl}"`);
    expect(html).toContain(`alt="Yasmine Benali"`);
  });

  it("omits the profile photo when photoUrl is not set", () => {
    const noPhotoCv: CvData = {
      ...sampleCv,
      personalInfo: { ...sampleCv.personalInfo, photoUrl: undefined },
    };
    const html = renderCvHtml(noPhotoCv, "classique");
    expect(html).not.toContain('<img class="photo"');
    expect(html).not.toContain('class="has-photo"');
    expect(html).toContain('<header data-editor-section="personalInfo">');
  });

  it("enforces A4 page size and 0.25in margins in the embedded CSS", () => {
    const html = renderCvHtml(sampleCv, "classique");
    expect(html).toContain("@page");
    expect(html).toContain("size: A4");
    expect(html).toContain("padding: 0.25in");
    expect(html).toContain("width: 210mm");
    expect(html).toContain("min-height: 297mm");
  });

  it("wraps content in .cv-canvas and .cv-paginated for multi-page layout", () => {
    const html = renderCvHtml(sampleCv, "classique");
    expect(html).toContain('<div class="cv-canvas">');
    expect(html).toMatch(/<div class="cv-paginated cv-overflow-\w+">/);
    // Includes the pagination script that posts height to parent and creates
    // page-rectangle backdrops.
    expect(html).toContain("cv-page-bg");
    expect(html).toContain("postMessage");
    expect(html).toContain("cv-wheel");
  });

  // AC5: renderer is the single source of truth — iframe preview, PDF pipeline,
  // and portfolio SSR all get identical output for the same input.
  it("produces deterministic output for the same CV + template (AC5)", () => {
    const a = renderCvHtml(sampleCv, "classique");
    const b = renderCvHtml(sampleCv, "classique");
    expect(a).toBe(b);
  });

  it("inlines the Classique CSS so iframe/PDF/SSR consumers share identical styles (AC5)", () => {
    const html = renderCvHtml(sampleCv, "classique");
    expect(html).toContain(classiqueCss);
  });

  it("renders the Moderne template with the same content as Classique", () => {
    const html = renderCvHtml(sampleCv, "moderne");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("Yasmine Benali");
    expect(html).toContain("<h2>Formations</h2>");
    // Moderne-specific accent color should appear in the inlined CSS.
    expect(html).toContain("#A8421E");
  });

  it("renders the Minimaliste template and hides the photo via CSS", () => {
    const html = renderCvHtml(sampleCv, "minimaliste");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("Yasmine Benali");
    expect(html).toContain("<h2>Formations</h2>");
    // Minimaliste hides the photo visually; the <img> still renders in DOM
    // (ATS-friendly alt text) but the CSS hides it.
    expect(html).toContain(".cv header .photo {\n  display: none;\n}");
  });

  it("round-trips through cvDataSchema.parse without errors", () => {
    expect(() => cvDataSchema.parse(sampleCv)).not.toThrow();
    const parsed = cvDataSchema.parse(sampleCv);
    expect(parsed.personalInfo.firstName).toBe("Yasmine");
    expect(parsed.formations.length).toBeGreaterThan(0);
  });
});

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert('xss')</script>`)).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
    );
    expect(escapeHtml(`a & b`)).toBe("a &amp; b");
    expect(escapeHtml(`"quoted"`)).toBe("&quot;quoted&quot;");
  });

  it("prevents XSS injected via personalInfo fields", () => {
    const malicious: CvData = {
      ...sampleCv,
      personalInfo: {
        ...sampleCv.personalInfo,
        firstName: `<img src=x onerror="alert(1)">`,
      },
    };
    const html = renderCvHtml(malicious, "classique");
    expect(html).not.toContain(`<img src=x onerror="alert(1)">`);
    expect(html).toContain("&lt;img");
  });
});

describe("safeHttpUrl", () => {
  it("accepts http and https URLs", () => {
    expect(safeHttpUrl("https://linkedin.com/in/x")).toBe("https://linkedin.com/in/x");
    expect(safeHttpUrl("http://example.com")).toBe("http://example.com");
  });

  it("rejects javascript:, data:, file:, vbscript:", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("JAVASCRIPT:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHttpUrl("file:///etc/passwd")).toBeNull();
    expect(safeHttpUrl("vbscript:msgbox")).toBeNull();
  });

  it("rejects invalid / empty input", () => {
    expect(safeHttpUrl(undefined)).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
  });

  it("prevents XSS through personalInfo.linkedinUrl", () => {
    const malicious: CvData = {
      ...sampleCv,
      personalInfo: {
        ...sampleCv.personalInfo,
        linkedinUrl: "javascript:alert(1)" as string,
      },
    };
    const html = renderCvHtml(malicious, "classique");
    // The dangerous URL must not appear anywhere in the output.
    expect(html).not.toContain("javascript:");
    // And the LinkedIn list item must be omitted, not rendered with a stripped href.
    expect(html).not.toContain("LinkedIn</a>");
  });
});

describe("safeImageUrl", () => {
  it("accepts http(s) and data:image/*", () => {
    expect(safeImageUrl("https://example.com/p.jpg")).toBe("https://example.com/p.jpg");
    expect(safeImageUrl("data:image/svg+xml;utf8,<svg/>")).toBe("data:image/svg+xml;utf8,<svg/>");
    expect(safeImageUrl("data:image/png;base64,abc")).toBe("data:image/png;base64,abc");
  });

  it("rejects data:text/html, javascript:, unknown schemes", () => {
    expect(safeImageUrl("data:text/html,<script>")).toBeNull();
    expect(safeImageUrl("javascript:alert(1)")).toBeNull();
    expect(safeImageUrl("file:///tmp/x.png")).toBeNull();
  });
});

describe("renderCvHtml — misc regressions", () => {
  it("filters out empty / whitespace-only bullets", () => {
    const cv: CvData = {
      ...sampleCv,
      experiences: [
        {
          id: "e1",
          jobTitle: "Dev",
          company: "Co",
          startDate: "2024-01",
          bullets: ["Real work", "", "   ", "Another thing"],
        },
      ],
    };
    const html = renderCvHtml(cv, "classique");
    // 2 real bullets, no empty <li>
    expect(html).toContain("<li>Real work</li>");
    expect(html).toContain("<li>Another thing</li>");
    expect(html).not.toMatch(/<li><\/li>/);
    expect(html).not.toMatch(/<li>\s*<\/li>/);
  });
});

describe("formatMonth", () => {
  it("formats a YYYY-MM string in French", () => {
    expect(formatMonth("2024-09")).toBe("septembre 2024");
    expect(formatMonth("2023-01")).toBe("janvier 2023");
    expect(formatMonth("2025-12")).toBe("décembre 2025");
  });

  it("falls back to escaped raw input on malformed dates", () => {
    expect(formatMonth("not-a-date")).toBe("not-a-date");
    expect(formatMonth("2024-13")).toBe("2024-13");
    expect(formatMonth("<script>")).toBe("&lt;script&gt;");
  });
});

describe("renderCvHtml — appearance.textSizes / mediaSize", () => {
  // The pagination script also references these var names, so a whole-document
  // search would always match. Pull just the inline `style` attribute on
  // <html> — that's the only place the renderer should emit them.
  const rootStyle = (html: string): string => {
    const m = html.match(/<html lang="fr" style="([^"]*)"/);
    return m?.[1] ?? "";
  };

  it("emits text-size delta CSS vars on <html> when set", () => {
    const html = renderCvHtml(
      {
        ...sampleCv,
        appearance: {
          textSizes: { paragraph: 1, header: -0.5, title: 2 },
          mediaSize: 3,
        },
      },
      "classique",
    );
    const style = rootStyle(html);
    expect(style).toContain("--cv-text-paragraph-delta: 1pt");
    expect(style).toContain("--cv-text-header-delta: -0.5pt");
    expect(style).toContain("--cv-text-title-delta: 2pt");
    expect(style).toContain("--cv-media-delta: 3mm");
  });

  it("omits delta vars when appearance is undefined", () => {
    const style = rootStyle(renderCvHtml(sampleCv, "classique"));
    expect(style).not.toContain("--cv-text-paragraph-delta");
    expect(style).not.toContain("--cv-media-delta");
    expect(style).not.toContain("--cv-space-page-delta");
    expect(style).not.toContain("--cv-line-height-delta");
  });

  it("clamps deltas defensively at render time", () => {
    const html = renderCvHtml(
      {
        ...sampleCv,
        // @ts-expect-error — deliberately out-of-range to exercise clamp
        appearance: { textSizes: { paragraph: 999 }, mediaSize: 999 },
      },
      "classique",
    );
    const style = rootStyle(html);
    expect(style).toContain("--cv-text-paragraph-delta: 5pt");
    expect(style).toContain("--cv-media-delta: 12mm");
  });

  it("emits spacing delta CSS vars on <html> when set", () => {
    const html = renderCvHtml(
      {
        ...sampleCv,
        appearance: {
          spacing: { pageMargin: 2, sectionGap: -1, itemGap: 3, lineHeight: 0.1 },
        },
      },
      "classique",
    );
    const style = rootStyle(html);
    expect(style).toContain("--cv-space-page-delta: 2mm");
    expect(style).toContain("--cv-space-section-delta: -1mm");
    expect(style).toContain("--cv-space-item-delta: 3mm");
    expect(style).toContain("--cv-line-height-delta: 0.1");
  });

  it("clamps spacing deltas defensively at render time", () => {
    const html = renderCvHtml(
      {
        ...sampleCv,
        // @ts-expect-error — deliberately out-of-range to exercise clamp
        appearance: { spacing: { pageMargin: 999, lineHeight: 99 } },
      },
      "classique",
    );
    const style = rootStyle(html);
    expect(style).toContain("--cv-space-page-delta: 8mm");
    expect(style).toContain("--cv-line-height-delta: 0.4");
  });
});
