import { s } from "./_scaled";

/**
 * Moderne CV template — "Éditorial Presse".
 *
 * Magazine-inspired layout: asymmetric header, italic display serif for
 * identity + section headings, rust accent used only for rules (never body
 * text), square photo, dates in tabular-nums, skills as inline hairline
 * row. Deliberately avoids the "premium green CV" Canva cliché.
 *
 * Accent: rust #A8421E — used for header rule, H2 rule, link underline.
 *   Kept out of body text so the ink (#111) carries the content.
 * Display: Fraunces italic (variable serif, Google Fonts) — headline.
 * Body: IBM Plex Sans (Google Fonts) — body + meta.
 *   Full fallback chain ensures offline PDF renders in Charter / Georgia
 *   / Helvetica without broken glyphs.
 *
 * Density scaling: content-owned absolute lengths are wrapped in `s()` so
 * the editor's density slider rescales them uniformly. Page geometry
 * (`@page`, `.cv`, `.cv-paginated`, `.cv-page-bg`, `.cv-canvas`,
 * `.cv-page-advisory`) stays literal — owned by the renderer. See
 * `_scaled.ts` for the full authoring rules.
 *
 * Contract — MUST match renderer.ts:
 *   - Selectors scoped under .cv / .cv-canvas / .cv-paginated / .cv-page-bg
 *   - @page A4 / margin 0 preserved for PDF pipeline
 *   - Pagination script measures :scope > header/section/article — no
 *     structural surprises that break those measurements
 *   - ATS: no position:absolute text, no pseudo-element text content that
 *     leaks into the PDF text stream
 */
export const moderneCss = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500;1,9..144,600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');

@page {
  size: A4;
  margin: 0;
}

.cv-canvas {
  background: #e9e6e0;
  padding: 24px 0 8px;
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
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
  box-shadow:
    0 0 0 0.75pt rgba(168, 66, 30, 0.14),
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
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 9pt;
  line-height: 1.5;
  color: #5a4a42;
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
  background: linear-gradient(to right, transparent, rgba(168, 66, 30, 0.35), transparent);
}

.cv-page-advisory .cv-page-advisory-text {
  font-style: italic;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.cv-page-advisory .cv-page-advisory-text strong {
  font-weight: 600;
  font-style: normal;
  color: #A8421E;
  text-transform: uppercase;
  letter-spacing: 0.14em;
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
  color: #111111;
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(10.5, "pt")};
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
  color: #111111;
  text-decoration: underline;
  text-decoration-color: #A8421E;
  text-decoration-thickness: ${s(0.5, "pt")};
  text-underline-offset: ${s(2, "px")};
}

.cv ul {
  margin: 0.3em 0 0 0;
  padding-left: 1.1em;
}

.cv li {
  margin-bottom: 0.2em;
}

/* Header — asymmetric editorial masthead.
   Name anchors left in large italic serif; photo (if present) sits right
   as a square (not round — avoids the "startup avatar" trope). Contact row
   is small-caps sans, pipe-separated. Rust hairline rule below. */
.cv header {
  position: relative;
  margin-bottom: ${s(6, "mm")};
  padding-bottom: ${s(3, "mm")};
  border-bottom: ${s(0.75, "pt")} solid #A8421E;
}

.cv header .header-top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${s(8, "mm")};
}

.cv header:not(.has-photo) .header-top {
  gap: 0;
}

.cv header .header-identity {
  flex: 1;
  min-width: 0;
}

.cv header .photo {
  flex-shrink: 0;
  width: ${s(26, "mm")};
  height: ${s(26, "mm")};
  object-fit: cover;
  /* Hard-anchor the crop to the top of the image so portrait photos never
     lose the head to the default 50/50 object-position. */
  object-position: center top;
  border-radius: 0;
  display: block;
  background: #f3f0ea;
  /* Frame ring as a border (not an outer box-shadow) — outer shadows get
     clipped by Chromium's @page content zone in PDF when the photo sits
     at the page edge. See classique.ts for the full rationale. */
  box-sizing: border-box;
  border: ${s(0.5, "pt")} solid rgba(17, 17, 17, 0.15);
}

.cv header h1 {
  margin: 0 0 ${s(1.5, "mm")} 0;
  font-family: "Fraunces", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${s(32, "pt")};
  font-weight: 500;
  font-style: italic;
  font-variation-settings: "opsz" 144;
  color: #111111;
  letter-spacing: -0.01em;
  line-height: 1.05;
}

.cv header .job-title {
  margin: 0 0 ${s(2, "mm")} 0;
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(10.5, "pt")};
  font-weight: 400;
  color: #3a3a3a;
  text-transform: uppercase;
  letter-spacing: 0.18em;
}

.cv header .contact {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: ${s(9, "pt")};
  color: #3a3a3a;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.cv header .contact li {
  display: inline-block;
  margin: 0;
}

.cv header .contact li + li::before {
  content: "|";
  margin: 0 0.55em;
  color: #A8421E;
  font-weight: 400;
}

.cv header .summary {
  /* Description/summary must span full content width of the page,
     respecting only the renderer-owned page margins. No max-width cap. */
  margin: ${s(3.5, "mm")} 0 0 0;
  font-family: "Fraunces", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${s(10.5, "pt")};
  line-height: 1.55;
  color: #222222;
  font-style: italic;
  font-variation-settings: "opsz" 14;
}

.cv section {
  margin-bottom: ${s(5, "mm")};
}

/* H2 — italic Fraunces small-caps look (via tracking + weight).
   Break-after AND break-inside both set so wrapping headings stay intact. */
.cv section h2 {
  position: relative;
  margin: 0 0 ${s(2.5, "mm")} 0;
  padding: 0 0 ${s(1, "mm")} 0;
  font-family: "Fraunces", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${s(13, "pt")};
  font-weight: 500;
  font-style: italic;
  font-variation-settings: "opsz" 144;
  color: #111111;
  letter-spacing: 0.01em;
  border-bottom: ${s(0.5, "pt")} solid #A8421E;
  page-break-after: avoid;
  page-break-inside: avoid;
  break-after: avoid;
  break-inside: avoid;
}

.cv article {
  margin-bottom: ${s(3, "mm")};
  page-break-inside: avoid;
  break-inside: avoid;
}

.cv article:last-child {
  margin-bottom: 0;
}

.cv article .entry-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: ${s(4, "mm")};
  margin-bottom: ${s(0.5, "mm")};
  page-break-after: avoid;
  break-after: avoid;
}

.cv article h3 {
  margin: 0;
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(11, "pt")};
  font-weight: 600;
  color: #111111;
  letter-spacing: 0.005em;
}

.cv article .entry-meta {
  margin: 0;
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(9, "pt")};
  font-weight: 400;
  color: #6a5a52;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-style: italic;
  letter-spacing: 0.01em;
}

.cv article .entry-sub {
  margin: 0 0 ${s(1, "mm")} 0;
  font-size: ${s(10, "pt")};
  color: #3a3a3a;
  page-break-after: avoid;
  break-after: avoid;
}

.cv article .entry-description {
  /* Full content width, inherits .cv padding as margin */
  margin: ${s(1, "mm")} 0 0 0;
  font-size: ${s(10, "pt")};
  color: #2a2a2a;
}

.cv article ul {
  list-style: none;
  padding-left: 0;
}

.cv article li {
  position: relative;
  padding-left: ${s(4, "mm")};
}

.cv article li::before {
  content: "—";
  position: absolute;
  left: 0;
  color: #A8421E;
  font-weight: 400;
}

/* Skills — disc-bulleted list grouped per category. Accent color on the
   category label keeps the Moderne palette cue; names stay neutral so the
   line reads as a scan-friendly taxonomy, not a style demo. */
.cv .skills-grouped {
  list-style: disc;
  margin: 0;
  padding-left: ${s(5, "mm")};
  font-size: ${s(10, "pt")};
  line-height: 1.55;
}

.cv .skills-grouped li {
  margin: 0;
}

.cv .skills-grouped li + li {
  margin-top: ${s(0.6, "mm")};
}

.cv .skills-grouped .skill-category {
  font-weight: 700;
  color: #A8421E;
}

.cv .skills-grouped .skill-name {
  font-weight: 500;
}

.cv .skills-grouped .skill-level {
  color: #6a5a52;
  font-style: italic;
  font-size: ${s(9.5, "pt")};
  margin-left: 0.2em;
}

.cv .languages-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: ${s(3, "mm")} ${s(7, "mm")};
  font-size: ${s(10, "pt")};
}

.cv .languages-list li {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.cv .languages-list .lang-name {
  font-weight: 600;
}

.cv .languages-list .lang-level {
  color: #6a5a52;
  font-style: italic;
  margin-left: 0.4em;
}

.cv .interests-list {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: ${s(10, "pt")};
}

.cv .interests-list li {
  display: inline;
  margin: 0;
}

.cv .interests-list li + li::before {
  content: "|";
  margin: 0 0.55em;
  color: #A8421E;
  font-weight: 400;
}

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
    background: #ffffff;
  }
  .cv [data-page-push] {
    padding-top: 0 !important;
  }
}
`;
