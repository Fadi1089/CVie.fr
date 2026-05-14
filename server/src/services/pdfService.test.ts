import { afterAll, describe, expect, it } from "bun:test";
import { sampleCv, type CvData } from "@cvie/shared";
import { PDFParse } from "pdf-parse";
import {
  generateCvPdf,
  generateResumePdf,
  inlineRemotePhotoForPdf,
  pdfFilename,
  shutdownPdfService,
  slugify,
} from "./pdfService";

async function extractText(pdf: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: pdf });
  const result = await parser.getText();
  return result.text;
}

/**
 * PDF generation tests. These hit a real headless Chromium, so they're slower
 * than unit tests (~1-3s each). Run with `bun test` from this package or
 * `bun run test` from the root.
 *
 * Requires `bunx playwright install chromium` to have been run.
 */

afterAll(async () => {
  await shutdownPdfService();
});

describe("generateCvPdf", () => {
  it("returns a Uint8Array whose first 4 bytes are %PDF (AC1)", async () => {
    const pdf = await generateCvPdf(sampleCv);
    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.length).toBeGreaterThan(1000);
    const header = new TextDecoder().decode(pdf.slice(0, 4));
    expect(header).toBe("%PDF");
  }, 30_000);

  it("extracted text contains every user-visible string from sampleCv (AC2)", async () => {
    const pdf = await generateCvPdf(sampleCv);
    const text = await extractText(pdf);

    const mustContain = [
      sampleCv.personalInfo.firstName,
      sampleCv.personalInfo.lastName,
      sampleCv.personalInfo.email!,
      sampleCv.personalInfo.jobTitle!,
      ...sampleCv.formations.map((f) => f.degree),
      ...sampleCv.formations.map((f) => f.school),
      ...sampleCv.experiences.map((e) => e.jobTitle),
      ...sampleCv.experiences.map((e) => e.company),
      ...sampleCv.experiences.flatMap((e) => e.bullets),
      ...sampleCv.skills.map((s) => s.name),
      ...sampleCv.languages.map((l) => l.name),
      ...sampleCv.interests.map((i) => i.name),
    ];

    for (const needle of mustContain) {
      expect(text).toContain(needle);
    }
  }, 30_000);

  it("all 5 French section headings appear in the correct order (AC3)", async () => {
    const pdf = await generateCvPdf(sampleCv);
    const text = await extractText(pdf);
    // CSS `text-transform: uppercase` on section h2's renders section labels
    // in uppercase in the PDF. Matching uppercase uniquely identifies the
    // section header (unlike e.g. "Compétences" which also appears in the
    // summary in lowercase). ATS parsers read these as section boundaries
    // just fine — uppercase is a canonical CV convention in French.
    //
    // Mirrors atelier-classique's SECTION_LABELS.fr in render order
    // (work, education, skills, languages, interests). If the theme's
    // labels or order change, update both here and in the theme.
    const headings = [
      "EXPÉRIENCES",
      "FORMATION",
      "COMPÉTENCES",
      "LANGUES",
      "CENTRES D'INTÉRÊT",
    ];
    const indexes = headings.map((h) => text.indexOf(h));
    for (let i = 0; i < indexes.length; i++) {
      expect(indexes[i]).toBeGreaterThanOrEqual(0);
    }
    // Strictly increasing order.
    for (let i = 1; i < indexes.length; i++) {
      expect(indexes[i]).toBeGreaterThan(indexes[i - 1]!);
    }
  }, 30_000);

  it("reuses the browser — warm calls complete in under 1s (AC5)", async () => {
    // Warm the browser (may be cold or warm depending on test order).
    await generateCvPdf(sampleCv);
    // Now measure a call against a guaranteed-warm browser. A cold Chromium
    // launch is 1-3s, so a sub-1s call proves the browser wasn't relaunched.
    const t = performance.now();
    await generateCvPdf(sampleCv);
    const warmMs = performance.now() - t;
    expect(warmMs).toBeLessThan(1000);
  }, 60_000);
});

describe("inlineRemotePhotoForPdf", () => {
  it("inlines an http(s) photo URL as a data URI before PDF rendering", async () => {
    const cv: CvData = {
      ...sampleCv,
      personalInfo: {
        ...sampleCv.personalInfo,
        photoUrl: "https://cdn.example.test/photo.png",
      },
    };

    const fetchMock = (async (input: string | URL | Request) => {
      expect(String(input)).toBe("https://cdn.example.test/photo.png");
      return new Response(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      });
    }) as typeof fetch;

    const result = await inlineRemotePhotoForPdf(cv, fetchMock);

    expect(result.personalInfo.photoUrl).toBe("data:image/png;base64,iVBORw==");
  });

  it("leaves existing data URIs untouched and skips fetch", async () => {
    let called = false;
    const fetchMock = (async () => {
      called = true;
      throw new Error("should not fetch an existing data URI");
    }) as unknown as typeof fetch;

    const result = await inlineRemotePhotoForPdf(sampleCv, fetchMock);

    expect(result.personalInfo.photoUrl).toBe(sampleCv.personalInfo.photoUrl);
    expect(called).toBe(false);
  });
});

describe("slugify", () => {
  it("strips accents and kebab-cases", () => {
    expect(slugify("Yasmine Benali")).toBe("yasmine-benali");
    expect(slugify("François Dupont")).toBe("francois-dupont");
    expect(slugify("Élise-Ève Müller")).toBe("elise-eve-muller");
    expect(slugify("  mul ti  spaces  ")).toBe("mul-ti-spaces");
  });

  it("handles empty input", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
  });
});

describe("pdfFilename", () => {
  it("returns {slug}-cv.pdf", () => {
    expect(pdfFilename(sampleCv)).toBe("yasmine-benali-cv.pdf");
  });

  it("falls back to 'cv-cv.pdf' when slug is empty", () => {
    const empty: CvData = {
      ...sampleCv,
      personalInfo: { ...sampleCv.personalInfo, firstName: " ", lastName: " " },
    };
    expect(pdfFilename(empty)).toBe("cv-cv.pdf");
  });
});

describe("generateResumePdf", () => {
  it("emits a valid A4 PDF with atelier-classique (AC1-new)", async () => {
    const bytes = await generateResumePdf({
      cv: sampleCv,
      themeId: "atelier-classique",
      atsMode: "ats-balanced",
      customization: {},
    });
    expect(bytes[0]).toBe(0x25); // %
    expect(bytes[1]).toBe(0x50); // P
    expect(bytes[2]).toBe(0x44); // D
    expect(bytes[3]).toBe(0x46); // F
    expect(bytes.byteLength).toBeGreaterThan(5_000);
  }, 30_000);
});
