import { s, sText, sMedia, sSpace, sLine } from "./_scaled";

/**
 * @generated from Figma template Classique.
 * Do not edit by hand; run `bun run generate:template-css`.
 */
export const classiqueCss = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600;6..72,700;6..72,800&family=Inter:wght@400;500;600&display=swap');

@page {
  size: A4;
  margin: 0;
  background: #FFFFFF;
}

.cv-canvas {
  background: var(--cv-canvas, #E6E4D8);
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
  background: #FFFFFF;
  box-shadow:
    0 0 0 0.5pt rgba(27, 54, 93, 0.16),
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
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif;
  font-size: 9pt;
  line-height: 1.5;
  color: var(--cv-soft, #5E5D59);
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
  background: linear-gradient(to right, transparent, rgba(27, 54, 93, 0.3), transparent);
}

.cv-page-advisory .cv-page-advisory-text {
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.cv-page-advisory .cv-page-advisory-text strong {
  font-weight: 700;
  color: var(--cv-accent, #1B365D);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 8pt;
  margin-right: 1.5mm;
}

.cv {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 210mm;
  min-height: 297mm;
  background: transparent;
  color: var(--cv-ink, #141413);
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${sText(10, "pt", "paragraph")};
  line-height: ${sLine(1.5)};
  orphans: 3;
  widows: 3;
}

.cv *,
.cv *::before,
.cv *::after {
  box-sizing: inherit;
}

.cv a {
  color: var(--cv-accent, #1B365D);
  text-decoration: none;
  text-decoration-color: var(--cv-accent, #1B365D);
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

.cv header {
  position: relative;
  margin-bottom: ${sSpace(2.6458, "mm", "section")};
  padding-bottom: ${s(3.9688, "mm")};
  border-bottom: ${s(0.75, "pt")} solid var(--cv-rule, #D4D2CC);
}

.cv header .header-top {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: ${s(5.2917, "mm")};
}

.cv header:not(.has-photo) .header-top {
  gap: 0;
}

.cv header .header-identity {
  position: relative;
  flex: 1;
  min-width: 0;
  padding: ${s(0, "mm")} ${s(0, "mm")} ${s(0, "mm")} ${s(4, "mm")};
}

.cv header .header-identity::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${s(2.5, "pt")};
  background: var(--cv-accent, #1B365D);
  border-radius: ${s(0.5292, "mm")} ${s(0, "mm")} ${s(0, "mm")} ${s(0.5292, "mm")};
}

.cv header .photo {
  flex-shrink: 0;
  width: ${sMedia(28, "mm")};
  height: ${sMedia(28, "mm")};
  object-fit: cover;
  object-position: center 22%;
  border-radius: ${s(1.5, "mm")};
  display: block;
  background: #E8E6DC;
  box-sizing: border-box;
  border: ${s(1.5, "pt")} solid var(--cv-accent, #1B365D);
}

.cv .portfolio-qr-box {
  width: ${sMedia(28, "mm")};
  height: ${sMedia(28, "mm")};
  border-radius: ${s(1.5, "mm")};
  background: #E8E6DC;
  box-sizing: border-box;
  border: ${s(1.5, "pt")} solid var(--cv-accent, #1B365D);
  overflow: hidden;
}

.cv .portfolio-qr-box img {
  width: 100%;
  height: 100%;
  display: block;
}

.cv .portfolio-qr-label {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  font-size: ${sText(7.5, "pt", "paragraph")};
  font-weight: 400;
  line-height: ${sLine(1.2102)};
  letter-spacing: 0em;
  color: var(--cv-soft, #5E5D59);
  text-transform: none;
}

.cv header h1 {
  margin: 0 0 ${s(5.2917, "mm")} 0;
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${sText(24, "pt", "title")};
  font-weight: 500;
  color: var(--cv-ink, #141413);
  letter-spacing: -0.01em;
  line-height: ${sLine(1.08)};
  font-style: normal;
  height: ${s(6.6146, "mm")};
  overflow: visible;
}

.cv header .job-title {
  margin: 0 0 ${s(5.2917, "mm")} 0;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  font-size: ${sText(18, "pt", "header")};
  font-weight: 500;
  color: var(--cv-accent, #1B365D);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: ${sLine(1.2102)};
  height: ${s(6.6146, "mm")};
  overflow: visible;
}

.cv header .contact {
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  font-size: ${sText(9, "pt", "paragraph")};
  color: var(--cv-soft, #5E5D59);
  line-height: ${sLine(1.2102)};
  letter-spacing: 0em;
}

.cv header .contact li {
  display: inline-block;
  margin: 0 ${s(2, "mm")} 0 0;
}

.cv header .contact li + li::before {
  content: none;
}

.cv header .contact a {
  color: var(--cv-ink, #141413);
}

.cv header .summary {
  margin: ${s(4, "mm")} 0 0 0;
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${sText(10, "pt", "title")};
  line-height: ${sLine(1.55)};
  color: var(--cv-ink, #141413);
  font-style: normal;
}

.cv section {
  margin-bottom: ${sSpace(2.6458, "mm", "section")};
  padding-bottom: ${sSpace(2.6458, "mm", "section")};
  border-bottom: ${s(0.5, "pt")} solid var(--cv-rule, #D4D2CC);
}

.cv section:last-of-type {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.cv section h2 {
  position: relative;
  margin: 0 0 ${s(2.6458, "mm")} 0;
  padding: ${s(0.4, "mm")} ${s(0, "mm")} ${s(0.4, "mm")} ${s(3, "mm")};
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${sText(15, "pt", "header")};
  font-weight: 800;
  color: var(--cv-ink, #141413);
  letter-spacing: 0em;
  line-height: ${sLine(1)};
  font-style: normal;
  
  page-break-after: avoid;
  break-after: avoid;
}

.cv section h2::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${s(2.5, "pt")};
  background: var(--cv-accent, #1B365D);
  border-radius: ${s(0.5292, "mm")} ${s(0, "mm")} ${s(0, "mm")} ${s(0.5292, "mm")};
}

.cv article {
  margin-bottom: ${sSpace(2.6458, "mm", "item")};
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
  margin-bottom: ${s(0.6, "mm")};
  page-break-after: avoid;
  break-after: avoid;
}

.cv article h3 {
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${sText(11, "pt", "header")};
  font-weight: 700;
  color: var(--cv-ink, #141413);
  letter-spacing: 0em;
  line-height: ${sLine(1.3)};
}

.cv article .entry-meta {
  margin: 0;
  flex-shrink: 0;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  font-size: ${sText(9, "pt", "header")};
  font-weight: 400;
  color: #87867F;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  line-height: ${sLine(1.3)};
  font-style: normal;
}

.cv article .entry-sub {
  margin: 0 0 ${s(0.6, "mm")} 0;
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${sText(10, "pt", "paragraph")};
  color: var(--cv-soft, #5E5D59);
  line-height: ${sLine(1.45)};
  font-style: normal;
  page-break-after: avoid;
  break-after: avoid;
}

.cv article .entry-description,
.cv article p,
.cv article li {
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${sText(9.5, "pt", "paragraph")};
  color: var(--cv-ink, #141413);
  line-height: ${sLine(1.45)};
}

.cv article .entry-description {
  margin: ${s(1, "mm")} 0 0 0;
}

.cv .skills-grouped {
  list-style: disc;
  margin: 0;
  padding-left: ${s(5, "mm")};
}

.cv .skills-grouped li {
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${sText(9.8, "pt", "paragraph")};
  margin: 0;
  line-height: ${sLine(1.5)};
  color: var(--cv-ink, #141413);
}

.cv .skills-grouped li + li {
  margin-top: ${sSpace(0.6, "mm", "item")};
}

.cv .skills-grouped .skill-category {
  font-weight: 700;
  color: var(--cv-ink, #141413);
}

.cv .skills-grouped .skill-name {
  color: var(--cv-ink, #141413);
}

.cv .skills-grouped .skill-level {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  color: var(--cv-soft, #5E5D59);
  font-size: ${sText(8.5, "pt", "paragraph")};
  margin-left: 0.2em;
  letter-spacing: 0.02em;
}

.cv .languages-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: ${sSpace(1.5, "mm", "item")} ${sSpace(7, "mm", "item")};
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${sText(9.8, "pt", "paragraph")};
  line-height: ${sLine(1.5)};
}

.cv .languages-list li {
  display: inline-flex;
  gap: 0.4em;
  margin: 0;
}

.cv .languages-list .lang-name {
  font-weight: 700;
}

.cv .languages-list .lang-level {
  color: var(--cv-soft, #5E5D59);
}

.cv .interests-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: ${sSpace(1.5, "mm", "item")} ${sSpace(4, "mm", "item")};
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${sText(9.8, "pt", "paragraph")};
  line-height: ${sLine(1.5)};
}

.cv .interests-list li {
  margin: 0;
}

.cv .interests-list li {
  display: inline;
}

.cv .interests-list li + li::before {
  content: " , ";
  color: #B0AEA5;
}
.cv article ul li::marker {
  content: "•  ";
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${sText(14.25, "pt", "paragraph")};
  color: var(--cv-ink, #141413);
}
.cv .skills-grouped li::marker {
  content: "•  ";
  font-family: "Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif;
  font-size: ${sText(14.7, "pt", "paragraph")};
  color: var(--cv-ink, #141413);
}

`;
