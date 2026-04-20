/**
 * Minimaliste CV template — black & white, no photo, typography-driven.
 *
 * Differences vs Classique:
 *   - Black accent only (#111) — no color
 *   - Section h2 uses capitalized sans with extended tracking (letter-spacing)
 *   - Header separator: 0.5pt thin rule
 *   - Section separator: 0.5pt thin rule (no gray)
 *   - Tighter line-height (1.4)
 *   - Photo hidden (anti-discrimination-friendly; photo is optional in FR law)
 *
 * All selectors scoped under `.cv` / `.cv-canvas` / `.cv-paginated` /
 * `.cv-page-bg`. The `@page` rule and `@media print` block are identical
 * to Classique — required so the PDF pipeline works unchanged.
 */
export const minimalisteCss = `
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
  padding: 0.25in 0.25in 0.25in calc(0.25in + 6mm);
  background: transparent;
  color: #111111;
  font-family: Helvetica, Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.4;
  /* Reset the section counter — each ::before on h2 will increment. */
  counter-reset: cv-section;
}

/* Thick black spine along the left edge — the defining visual of the
   Minimaliste template. Runs top-to-bottom of the page. */
.cv::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 6mm;
  background: #111111;
  pointer-events: none;
  z-index: 0;
}

/* Monogram in the top-right — subtle publication-style marker. */
.cv::after {
  content: "CV";
  position: absolute;
  top: 8mm;
  right: 10mm;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 7.5pt;
  font-weight: 500;
  letter-spacing: 0.25em;
  color: #888888;
  pointer-events: none;
  z-index: 0;
}

.cv *,
.cv *::before,
.cv *::after {
  box-sizing: inherit;
}

.cv a {
  color: #111111;
  text-decoration: underline;
}

.cv ul {
  margin: 0.25em 0 0 0;
  padding-left: 1.1em;
}

.cv li {
  margin-bottom: 0.15em;
}

/* Header — thin rule, no color */
.cv header {
  margin-bottom: 8mm;
  padding-bottom: 4mm;
  border-bottom: 0.5pt solid #111111;
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

/* Photo hidden — minimalist + anti-discrimination-friendly */
.cv header .photo {
  display: none;
}

.cv header h1 {
  margin: 0 0 2mm 0;
  font-family: Helvetica, Arial, sans-serif;
  font-size: 20pt;
  font-weight: 400;
  color: #111111;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.cv header .job-title {
  margin: 0 0 3mm 0;
  font-size: 10.5pt;
  font-weight: 400;
  color: #444444;
  letter-spacing: 0.04em;
}

.cv header .contact {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 9.5pt;
  color: #444444;
}

.cv header .contact li {
  display: inline-block;
  margin: 0;
}

.cv header .contact li + li::before {
  content: " / ";
  margin: 0 0.4em;
  color: #888888;
}

.cv header .summary {
  margin: 5mm 0 0 0;
  font-size: 10pt;
  line-height: 1.5;
  color: #222222;
}

/* Section — sans-serif, uppercase, wide tracking, thin rule */
.cv section {
  margin-bottom: 6mm;
  page-break-inside: avoid;
  break-inside: avoid;
}

.cv section h2 {
  position: relative;
  margin: 0 0 3mm 0;
  padding: 0 0 1.5mm 12mm;
  font-family: Helvetica, Arial, sans-serif;
  font-size: 10.5pt;
  font-weight: 700;
  color: #111111;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  border-bottom: 0.5pt solid #111111;
  counter-increment: cv-section;
}

/* Magazine-style section number rendered via CSS counter — purely visual,
   does not appear in the DOM's textContent (and pdf-parse picks it up as
   "01 FORMATIONS" etc., which doesn't hurt ATS section-heading detection). */
.cv section h2::before {
  content: counter(cv-section, decimal-leading-zero);
  position: absolute;
  left: 0;
  top: 0;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 10.5pt;
  font-weight: 500;
  letter-spacing: 0.05em;
  color: #111111;
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
  font-weight: 600;
  color: #111111;
}

.cv article .entry-meta {
  margin: 0;
  font-size: 9.5pt;
  color: #555555;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.cv article .entry-sub {
  margin: 0 0 1mm 0;
  font-size: 10pt;
  color: #333333;
}

.cv article .entry-description {
  margin: 1mm 0 0 0;
  font-size: 10pt;
  color: #222222;
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
  color: #555555;
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
  color: #555555;
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
  content: " / ";
  margin: 0 0.4em;
  color: #888888;
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
