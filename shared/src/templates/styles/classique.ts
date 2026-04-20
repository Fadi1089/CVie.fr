/**
 * Classique CV template — traditional French CV style.
 *
 * Typography: Georgia (serif) for headings, Helvetica/Arial (sans-serif) for body.
 * Independent from the app's SF Pro UI typography.
 *
 * All selectors scoped under `.cv` (or `.cv-paginated` / `.cv-page-bg` for
 * pagination chrome) — no global resets, no body/html rules that would leak.
 *
 * Page geometry:
 *   - Width: 210mm (A4)
 *   - Min-height: 297mm
 *   - Padding: 0.25in (6.35mm) on all four sides
 *   - @page rule sets PDF page size to A4 with no extra margins
 *   - Visual page rectangles (.cv-page-bg) layered behind content via JS to
 *     give a Google Docs-style multi-page preview
 *   - Whole sections respect page breaks (break-inside: avoid on section)
 *
 * ATS notes:
 *   - Background graphics, gradients, decorative pseudo-elements: SAFE
 *     (text extractors only read the DOM text content, not visuals).
 *   - Photo as <img>: ignored by ATS, alt text contains the candidate's name.
 *   - Layout uses CSS Grid/Flex visually but DOM order is linear, so ATS
 *     extracts content in correct reading order.
 */
export const classiqueCss = `
@page {
  size: A4;
  margin: 0;
}

/* Canvas wrapper — scoped to .cv-canvas so the template CSS doesn't leak.
   This gives the iframe-preview a warm gray backdrop around the page(s).
   For PDF rendering, @media print strips it (below).
   For non-iframe SSR consumers, the .cv-canvas div can be dropped from the
   containing HTML; nothing here affects the host document styles. */
.cv-canvas {
  background: #d8d8dc;
  padding: 24px 0 8px;
  font-family: Helvetica, Arial, sans-serif;
}

/* Pagination wrapper — holds the .cv content + .cv-page-bg backdrops */
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
  /* Hairline outline + soft drop shadow makes each page sheet readable
     even when stacked with no visual gap. */
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.06),
    0 1px 1px rgba(0, 0, 0, 0.04),
    0 2mm 5mm -1mm rgba(0, 0, 0, 0.10);
  z-index: 0;
  pointer-events: none;
}

/* Subtle horizontal rule between pages so the "fold" between sheets is
   readable. Drawn ON TOP of the .cv-page-bg using its bottom edge. */
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
  background: transparent;
  color: #1a1a1a;
  font-family: Helvetica, Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.45;
}

.cv *,
.cv *::before,
.cv *::after {
  box-sizing: inherit;
}

.cv a {
  color: #1E3A5F;
  text-decoration: none;
}

.cv ul {
  margin: 0.25em 0 0 0;
  padding-left: 1.1em;
}

.cv li {
  margin-bottom: 0.15em;
}

/* Header — Personal info */
.cv header {
  margin-bottom: 8mm;
  padding-bottom: 4mm;
  border-bottom: 2px solid #1E3A5F;
}

/* Top row: identity (name+title+contact) on the left, optional photo on the right.
   Photo aligns to vertical center of the identity block — clean, balanced. */
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
  /* Square with slightly rounded corners */
  border-radius: 1.5mm;
  display: block;
  background: #f3f4f6;
  /* Frame: thin slate ring + soft drop shadow for depth.
     Using box-shadow instead of border so the inner image isn't clipped. */
  box-shadow:
    0 0 0 1.25pt #1E3A5F,
    0 0.6mm 1.5mm rgba(0, 0, 0, 0.08);
}

.cv header h1 {
  margin: 0 0 2mm 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 22pt;
  font-weight: 700;
  color: #1E3A5F;
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
  line-height: 1.5;
  color: #2a2a2a;
  /* Subtle accent: italic small intro signals this is a personal statement */
  font-style: italic;
}

/* Section — entire section respects page boundaries */
.cv section {
  margin-bottom: 6mm;
  page-break-inside: avoid;
  break-inside: avoid;
}

.cv section h2 {
  margin: 0 0 3mm 0;
  padding-bottom: 1mm;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 13pt;
  font-weight: 700;
  color: #1E3A5F;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #C7C7CC;
}

/* Article — individual entry; also stays together if possible */
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

/* Skills — grouped by category */
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

/* Languages */
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

/* Interests — inline */
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

/* Print / PDF — strip preview chrome, use raw page */
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
