import { s } from "./_scaled";

/**
 * Classique CV template — "Papier Kami".
 *
 * Editorial French CV: parchment page, single ink-blue accent, serif-led
 * hierarchy with sans UI metadata. Brand left-bar on every section title
 * is the signature move. No italics anywhere — Helvetica's synthesized
 * oblique was clipping trailing glyphs inside nowrap flex dates; the
 * serif body + sans meta pair sidesteps that entirely and also lifts
 * readability past the earlier Helvetica/Georgia mix.
 *
 * Typography:
 *   - Serif (body, headings, names, entry titles): Newsreader
 *     (Google Fonts, variable, free). Warmer + more editorial than
 *     Georgia; wider optical sizes keep counters open at small print pt.
 *   - Sans (contact, dates, job title kicker, skill levels): Inter.
 *     Tabular-nums on all metadata so right-aligned dates line up.
 *
 * Colour:
 *   - Parchment #ffffff — page background, set via `@page { background }`
 *     so Chromium paints the sheet edge-to-edge (PDF uses
 *     `printBackground: true`).
 *   - Ink-blue #1B365D — single accent: section-title left bar, photo
 *     frame, kicker, link colour. Never used on body text.
 *   - Warm greys (olive #5e5d59, stone #87867f, near-black #141413) —
 *     hierarchy without cool blue-grey drift.
 *
 * Bug fixes baked into this revision:
 *   - Photo crop: `object-position: center 22%` biases the crop toward
 *     the top so portrait head-shots stay intact.
 *   - Date right-edge clipping: no italic anywhere; h3 gets
 *     `min-width: 0 + flex: 1 1 auto` so a long title wraps instead of
 *     shoving `.entry-meta` past the content zone; meta is
 *     `flex-shrink: 0` + `tabular-nums` so dates never compress.
 *   - Pagination: inherits the renderer's overflow-mode contract; the
 *     template adds no page-break rules beyond `break-inside: avoid` on
 *     article, which matches the other templates.
 *
 * Density scaling: every content-owned absolute length is wrapped in
 * `s()` so the editor density slider rescales them uniformly. Page
 * geometry (`@page`, `.cv`, `.cv-paginated`, `.cv-page-bg`, `.cv-canvas`,
 * `.cv-page-advisory`) stays literal — owned by the renderer. See
 * `_scaled.ts` for the full authoring rules.
 *
 * Contract — MUST match renderer.ts:
 *   - Selectors scoped under .cv / .cv-canvas / .cv-paginated / .cv-page-bg
 *   - @page size A4; BASE_PAGE_CSS appends margin 0.25in afterwards
 *   - ATS: linear DOM order preserved, no position:absolute text,
 *     no pseudo-element text content that leaks into the PDF text stream
 */
export const classiqueCss = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Inter:wght@400;500;600&display=swap');

@page {
  size: A4;
  margin: 0;
  background: #ffffff;
}

/* Canvas wrapper — scoped to .cv-canvas so template CSS doesn't leak.
   Slightly darker parchment behind the sheet gives the iframe preview
   a warm gallery-wall feel; @media print restores a flat parchment. */
.cv-canvas {
  background: #e6e4d8;
  padding: 24px 0 8px;
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif;
}

.cv-paginated {
  position: relative;
  width: 210mm;
  margin: 0 auto;
  padding: 0;
}

.cv-page-bg {
  position: absolute;
  left: 0;
  width: 210mm;
  height: 297mm;
  background: #ffffff;
  /* Hairline ring in ink-blue + layered whisper shadows for paper depth. */
  box-shadow:
    0 0 0 0.5pt rgba(27, 54, 93, 0.14),
    0 1px 2px rgba(10, 10, 10, 0.05),
    0 4mm 10mm -2mm rgba(10, 10, 10, 0.10),
    0 8mm 20mm -6mm rgba(10, 10, 10, 0.08);
  z-index: 0;
  pointer-events: none;
}

.cv-page-advisory {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 2;
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, serif;
  font-size: 9pt;
  line-height: 1.5;
  color: #5e5d59;
  text-align: center;
  padding: 0 14mm;
}

.cv-page-advisory .cv-page-advisory-inner {
  display: inline-flex;
  align-items: center;
  gap: 4mm;
  max-width: 160mm;
}

.cv-page-advisory .cv-page-advisory-rule {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(27, 54, 93, 0.28), transparent);
}

.cv-page-advisory .cv-page-advisory-text {
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.cv-page-advisory .cv-page-advisory-text strong {
  font-family: "Inter", -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-weight: 600;
  color: #1B365D;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 8pt;
  margin-right: 1.5mm;
}

.cv {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 210mm;
  min-height: 297mm;
  padding: 0.25in;
  background: transparent;
  color: #141413;
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${s(10, "pt")};
  line-height: 1.5;
  orphans: 3;
  widows: 3;
}

.cv *,
.cv *::before,
.cv *::after {
  box-sizing: inherit;
}

.cv a {
  color: #1B365D;
  text-decoration: none;
}

.cv ul {
  margin: ${s(1.2, "mm")} 0 0 0;
  padding-left: ${s(4.5, "mm")};
}

.cv li {
  margin-bottom: ${s(0.6, "mm")};
}

/* Header — identity block carries the brand left bar so the whole top
   of the page opens with the same typographic signature used on every
   section heading below. Photo clears the bar on the right. */
.cv header {
  margin-bottom: ${s(6, "mm")};
  padding-bottom: ${s(3.5, "mm")};
  border-bottom: ${s(0.5, "pt")} solid #d9d6c7;
}

.cv header .header-top {
  display: flex;
  align-items: center;
  gap: ${s(7, "mm")};
}

.cv header .header-identity {
  flex: 1;
  min-width: 0;
  border-left: ${s(2.5, "pt")} solid #1B365D;
  border-radius: ${s(1.5, "pt")};
  padding-left: ${s(4, "mm")};
}

.cv header .photo {
  flex-shrink: 0;
  width: ${s(28, "mm")};
  height: ${s(28, "mm")};
  object-fit: cover;
  /* Top-biased crop keeps portrait head-shots intact inside the square
     frame — the default 50/50 object-position trimmed heads. */
  object-position: center 22%;
  border-radius: ${s(1.5, "mm")};
  display: block;
  background: #e8e6dc;
  /* Frame ring as a real border (not a box-shadow). Outer shadows get
     clipped by Chromium's @page content zone when the photo sits near
     the sheet top and produce a flat top edge on the exported frame. */
  box-sizing: border-box;
  border: ${s(0.75, "pt")} solid #1B365D;
}

.cv header h1 {
  margin: 0 0 ${s(1.2, "mm")} 0;
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, serif;
  font-size: ${s(24, "pt")};
  font-weight: 500;
  color: #141413;
  letter-spacing: -0.01em;
  line-height: 1.08;
}

.cv header .job-title {
  margin: 0 0 ${s(2.2, "mm")} 0;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  font-size: ${s(9, "pt")};
  font-weight: 500;
  color: #1B365D;
  text-transform: uppercase;
  letter-spacing: 0.2em;
}

.cv header .contact {
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  font-size: ${s(9, "pt")};
  color: #5e5d59;
  line-height: 1.5;
}

.cv header .contact li {
  display: inline-block;
  margin: 0;
}

.cv header .contact li + li::before {
  content: "·";
  margin: 0 0.45em;
  color: #b0aea5;
}

.cv header .contact a {
  color: #3d3d3a;
}

.cv header .summary {
  margin: ${s(4, "mm")} 0 0 0;
  font-size: ${s(10, "pt")};
  line-height: 1.55;
  color: #141413;
}

/* Section — vertical rhythm between blocks. */
.cv section {
  margin-bottom: ${s(5, "mm")};
}

/* H2 — the kami signature: 2.5pt ink-blue left bar, serif 500, no
   uppercase, no underline. The border-left is drawn on the h2 element
   itself (not a pseudo) so ATS text extraction stays clean. */
.cv section h2 {
  margin: 0 0 ${s(2.5, "mm")} 0;
  padding: ${s(0.4, "mm")} 0 ${s(0.4, "mm")} ${s(3, "mm")};
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, serif;
  font-size: ${s(13, "pt")};
  font-weight: 500;
  color: #141413;
  letter-spacing: 0;
  border-left: ${s(2.5, "pt")} solid #1B365D;
  border-radius: ${s(1.5, "pt")};
  page-break-after: avoid;
  break-after: avoid;
}

/* Article — individual entry stays together on one page. */
.cv article {
  margin-bottom: ${s(3.5, "mm")};
  page-break-inside: avoid;
  break-inside: avoid;
}

.cv article:last-child {
  margin-bottom: 0;
}

/* Entry header: title left, dates right. h3 gets min-width:0 + flex so
   long titles wrap instead of pushing the nowrap date off the right
   edge of the content zone (the "aujourd'hu…" clipping bug). Meta is
   flex-shrink:0 so dates never compress. */
.cv article .entry-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: ${s(4, "mm")};
  margin-bottom: ${s(0.6, "mm")};
  page-break-after: avoid;
  break-after: avoid;
}

.cv article h3 {
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, serif;
  font-size: ${s(11, "pt")};
  font-weight: 500;
  color: #141413;
  letter-spacing: 0;
}

.cv article .entry-meta {
  margin: 0;
  flex-shrink: 0;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  font-size: ${s(9, "pt")};
  font-weight: 400;
  color: #87867f;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}

.cv article .entry-sub {
  margin: 0 0 ${s(0.6, "mm")} 0;
  font-size: ${s(10, "pt")};
  color: #5e5d59;
  page-break-after: avoid;
  break-after: avoid;
}

.cv article .entry-description {
  margin: ${s(1, "mm")} 0 0 0;
  font-size: ${s(9.5, "pt")};
  color: #141413;
  line-height: 1.5;
}

/* Skills — disc-bulleted list, one line per category: "- **Cat :** a, b, c".
   Comma-joined names keep the block dense; category label in bold anchors
   the scan pattern French recruiters expect from "Compétences techniques". */
.cv .skills-grouped {
  list-style: disc;
  margin: 0;
  padding-left: ${s(5, "mm")};
}

.cv .skills-grouped li {
  font-size: ${s(9.8, "pt")};
  margin: 0;
  line-height: 1.55;
}

.cv .skills-grouped li + li {
  margin-top: ${s(0.6, "mm")};
}

.cv .skills-grouped .skill-category {
  font-weight: 700;
  color: #141413;
}

.cv .skills-grouped .skill-name {
  color: #141413;
}

.cv .skills-grouped .skill-level {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  color: #87867f;
  font-size: ${s(8.5, "pt")};
  margin-left: 0.2em;
  letter-spacing: 0.02em;
}

/* Languages — inline flex row, name + level. */
.cv .languages-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: ${s(1.5, "mm")} ${s(7, "mm")};
  font-size: ${s(9.8, "pt")};
}

.cv .languages-list li {
  margin: 0;
}

.cv .languages-list .lang-name {
  font-weight: 500;
  color: #141413;
}

.cv .languages-list .lang-level {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  color: #87867f;
  font-size: ${s(8.5, "pt")};
  margin-left: 0.45em;
  letter-spacing: 0.02em;
}

/* Interests — inline, middle-dot separated. */
.cv .interests-list {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: ${s(9.8, "pt")};
  color: #141413;
}

.cv .interests-list li {
  display: inline;
  margin: 0;
}

.cv .interests-list li + li::before {
  content: "·";
  margin: 0 0.55em;
  color: #b0aea5;
}

/* Print / PDF — strip preview chrome, keep parchment. */
@media print {
  .cv-canvas {
    background: #ffffff;
    padding: 0;
  }
  .cv-page-bg,
  .cv-page-advisory {
    display: none;
  }
  .cv-paginated,
  .cv {
    margin: 0;
    box-shadow: none;
  }
  /* Any preview-only push applied by the pagination script must be
     neutralised in print so Playwright's own page-break algorithm
     stays authoritative. */
  .cv [data-page-push] {
    padding-top: 0 !important;
  }
}
`;
