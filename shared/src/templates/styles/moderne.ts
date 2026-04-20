/**
 * Moderne CV template — contemporary French CV style with muted green accent.
 *
 * Differences vs Classique:
 *   - Accent color: muted forest green (#2D5F3F) instead of slate blue
 *   - h1 uses sans-serif (Helvetica) — serif reserved for section headings
 *   - Thinner 1pt header underline
 *   - No photo frame ring (just soft shadow + light background)
 *   - Section underline uses the accent tint, not a gray separator
 *
 * All selectors scoped under `.cv` / `.cv-canvas` / `.cv-paginated` /
 * `.cv-page-bg`. The `@page` rule and `@media print` block are identical
 * to Classique — required so the PDF pipeline works unchanged.
 */
export const moderneCss = `
@page {
  size: A4;
  margin: 0;
}

.cv-canvas {
  background: #d8d8dc;
  padding: 24px 0 8px;
  font-family: Helvetica, Arial, sans-serif;
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
    0 0 0 1px rgba(0, 0, 0, 0.06),
    0 1px 1px rgba(0, 0, 0, 0.04),
    0 2mm 5mm -1mm rgba(0, 0, 0, 0.10);
  z-index: 0;
  pointer-events: none;
}

.cv-page-bg + .cv-page-bg {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.cv {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 210mm;
  min-height: 297mm;
  padding: 0.25in;
  /* Two-layer background: a quarter-circle of tinted green in the bottom-right
     + a soft gradient field that fades to nothing. Sits behind all text
     (z-index:1 on .cv, but ::before is below content in stacking order). */
  background:
    radial-gradient(
      circle at 100% 100%,
      rgba(45, 95, 63, 0.14) 0,
      rgba(45, 95, 63, 0.09) 35mm,
      transparent 70mm
    ),
    linear-gradient(135deg, rgba(45, 95, 63, 0.04) 0%, transparent 40%);
  color: #1a1a1a;
  font-family: Helvetica, Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.5;
}

/* Full-width accent band at the very top of the page — announces the
   Moderne aesthetic before the user reads any text. */
.cv::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 8mm;
  background: #2D5F3F;
  pointer-events: none;
  z-index: 0;
}

/* Monospaced watermark — visible only if you look for it. */
.cv::after {
  content: "MODERNE";
  position: absolute;
  top: 2.5mm;
  right: 10mm;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 8pt;
  font-weight: 600;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.85);
  z-index: 1;
  pointer-events: none;
}

.cv *,
.cv *::before,
.cv *::after {
  box-sizing: inherit;
}

.cv a {
  color: #2D5F3F;
  text-decoration: none;
}

.cv ul {
  margin: 0.25em 0 0 0;
  padding-left: 1.1em;
}

.cv li {
  margin-bottom: 0.15em;
}

/* Header — thinner underline, green accent.
   margin-top pushes past the 8mm top accent band. */
.cv header {
  position: relative;
  margin-top: 5mm;
  margin-bottom: 8mm;
  padding-bottom: 4mm;
  border-bottom: 1pt solid #2D5F3F;
  z-index: 2;
}

.cv header .header-top {
  display: flex;
  align-items: center;
  gap: 8mm;
}

.cv header .header-identity {
  flex: 1;
  min-width: 0;
}

.cv header .photo {
  flex-shrink: 0;
  width: 28mm;
  height: 28mm;
  object-fit: cover;
  border-radius: 1.5mm;
  display: block;
  background: #f3f4f6;
  /* Soft shadow only — no frame ring. */
  box-shadow: 0 0.6mm 1.5mm rgba(0, 0, 0, 0.08);
}

.cv header h1 {
  margin: 0 0 2mm 0;
  font-family: Helvetica, Arial, sans-serif;
  font-size: 22pt;
  font-weight: 600;
  color: #2D5F3F;
  letter-spacing: 0.01em;
}

.cv header .job-title {
  margin: 0 0 3mm 0;
  font-size: 11pt;
  font-weight: 400;
  color: #3B4A5A;
  font-style: italic;
}

.cv header .contact {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 9.5pt;
  color: #3B4A5A;
}

.cv header .contact li {
  display: inline-block;
  margin: 0;
}

.cv header .contact li + li::before {
  content: " · ";
  margin: 0 0.4em;
  color: #8A8A8A;
}

.cv header .summary {
  margin: 5mm 0 0 0;
  font-size: 10pt;
  line-height: 1.55;
  color: #2a2a2a;
  font-style: italic;
}

/* Section — serif heading + green tint underline */
.cv section {
  margin-bottom: 6mm;
  page-break-inside: avoid;
  break-inside: avoid;
}

.cv section h2 {
  position: relative;
  margin: 0 0 3mm 0;
  padding: 0 0 1mm 5mm;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 13pt;
  font-weight: 700;
  color: #2D5F3F;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid rgba(45, 95, 63, 0.25);
}

.cv section h2::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.35em;
  width: 3mm;
  height: 3mm;
  background: #2D5F3F;
  border-radius: 50%;
  pointer-events: none;
}

.cv article {
  margin-bottom: 4mm;
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
  gap: 4mm;
  margin-bottom: 1mm;
}

.cv article h3 {
  margin: 0;
  font-family: Helvetica, Arial, sans-serif;
  font-size: 11pt;
  font-weight: 700;
  color: #1a1a1a;
}

.cv article .entry-meta {
  margin: 0;
  font-size: 9.5pt;
  font-style: italic;
  color: #5a5a5a;
  white-space: nowrap;
}

.cv article .entry-sub {
  margin: 0 0 1mm 0;
  font-size: 10pt;
  color: #3B4A5A;
}

.cv article .entry-description {
  margin: 1mm 0 0 0;
  font-size: 10pt;
  color: #2a2a2a;
}

.cv .skills-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2mm 8mm;
  list-style: none;
  margin: 0;
  padding: 0;
}

.cv .skills-grid li {
  font-size: 10pt;
  margin: 0;
}

.cv .skills-grid .skill-name {
  font-weight: 600;
}

.cv .skills-grid .skill-level {
  color: #5a5a5a;
  font-style: italic;
  font-size: 9.5pt;
}

.cv .languages-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4mm 8mm;
}

.cv .languages-list li {
  font-size: 10pt;
  margin: 0;
}

.cv .languages-list .lang-name {
  font-weight: 600;
}

.cv .languages-list .lang-level {
  color: #5a5a5a;
  margin-left: 0.4em;
}

.cv .interests-list {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 10pt;
}

.cv .interests-list li {
  display: inline;
  margin: 0;
}

.cv .interests-list li + li::before {
  content: " · ";
  margin: 0 0.4em;
  color: #8A8A8A;
}

@media print {
  .cv-canvas {
    background: #ffffff;
    padding: 0;
  }
  .cv-page-bg {
    display: none;
  }
  .cv-paginated,
  .cv {
    margin: 0;
    box-shadow: none;
  }
}
`;
