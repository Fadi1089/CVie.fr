import { s } from "./_scaled";

/**
 * @generated from Figma template Moderne.
 * Do not edit by hand; run `bun run generate:template-css`.
 */
export const moderneCss = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500;1,9..144,600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');

@page {
  size: A4;
  margin: 0;
  background: #FFFFFF;
}

.cv-canvas {
  background: #E9E6E0;
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
  background: #FFFFFF;
  box-shadow:
    0 0 0 0.5pt rgba(168, 66, 30, 0.16),
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
  color: #3A3A3A;
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
  background: linear-gradient(to right, transparent, rgba(168, 66, 30, 0.3), transparent);
}

.cv-page-advisory .cv-page-advisory-text {
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.cv-page-advisory .cv-page-advisory-text strong {
  font-weight: 700;
  color: #A8421E;
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

.cv header {
  position: relative;
  margin-bottom: ${s(5, "mm")};
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
  position: relative;
  flex: 1;
  min-width: 0;
  padding: ${s(0, "mm")} ${s(0, "mm")} ${s(0, "mm")} ${s(0, "mm")};
}

.cv header .header-identity::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${s(0.75, "pt")};
  background: #A8421E;
  border-radius: ${s(0, "mm")} ${s(0, "mm")} ${s(0, "mm")} ${s(0, "mm")};
}

.cv header .photo {
  flex-shrink: 0;
  width: ${s(26, "mm")};
  height: ${s(26, "mm")};
  object-fit: cover;
  object-position: center top;
  border-radius: ${s(0, "mm")};
  display: block;
  background: #F3F0EA;
  box-sizing: border-box;
  border: ${s(1.5, "pt")} solid #111111;
}

.cv .portfolio-qr-box {
  width: ${s(26, "mm")};
  height: ${s(26, "mm")};
  border-radius: ${s(0, "mm")};
  background: #F3F0EA;
  box-sizing: border-box;
  border: ${s(1.5, "pt")} solid #111111;
  overflow: hidden;
}

.cv .portfolio-qr-box img {
  width: 100%;
  height: 100%;
  display: block;
}

.cv .portfolio-qr-label {
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(7.5, "pt")};
  font-weight: 400;
  line-height: 1.3;
  letter-spacing: 0em;
  color: #3A3A3A;
  text-transform: none;
}

.cv header h1 {
  margin: 0 0 ${s(1.5, "mm")} 0;
  font-family: "Fraunces", "Newsreader", Georgia, serif;
  font-size: ${s(32, "pt")};
  font-weight: 400;
  color: #111111;
  letter-spacing: -0.01em;
  line-height: 1.05;
  font-style: normal;
  height: ${s(13.7583, "mm")};
  overflow: visible;
}

.cv header .job-title {
  margin: 0 0 ${s(1.5, "mm")} 0;
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(10.5, "pt")};
  font-weight: 700;
  color: #3A3A3A;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: 1.3;
}

.cv header .contact {
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(9, "pt")};
  color: #3A3A3A;
  line-height: 1.3;
  letter-spacing: 0.02em;
}

.cv header .contact li {
  display: inline-block;
  margin: 0 ${s(2, "mm")} 0 0;
}

.cv header .contact li + li::before {
  content: none;
}

.cv header .contact a {
  color: #111111;
}

.cv header .summary {
  margin: ${s(3.5, "mm")} 0 0 0;
  font-family: "Fraunces", "Newsreader", Georgia, serif;
  font-size: ${s(11.25, "pt")};
  line-height: 1.55;
  color: #222222;
  font-style: normal;
}

.cv section {
  margin-bottom: ${s(5, "mm")};
  
}

.cv section:last-of-type {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.cv section h2 {
  position: relative;
  margin: 0 0 ${s(2.5, "mm")} 0;
  padding: ${s(0, "mm")} ${s(0, "mm")} ${s(1, "mm")} ${s(0, "mm")};
  font-family: "Fraunces", "Newsreader", Georgia, serif;
  font-size: ${s(13, "pt")};
  font-weight: 700;
  color: #111111;
  letter-spacing: 0.01em;
  line-height: 1.5;
  font-style: italic;
  border-bottom: ${s(0.5, "pt")} solid #A8421E;
  page-break-after: avoid;
  break-after: avoid;
}



.cv article {
  margin-bottom: ${s(2.5, "mm")};
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
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(11, "pt")};
  font-weight: 600;
  color: #111111;
  letter-spacing: 0.005em;
  line-height: 1.3;
}

.cv article .entry-meta {
  margin: 0;
  flex-shrink: 0;
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(9, "pt")};
  font-weight: 400;
  color: #6A5A52;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  line-height: 1.3;
  font-style: normal;
}

.cv article .entry-sub {
  margin: 0 0 ${s(0.6, "mm")} 0;
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(10.75, "pt")};
  color: #3A3A3A;
  line-height: 1.5;
  font-style: normal;
  page-break-after: avoid;
  break-after: avoid;
}

.cv article .entry-description,
.cv article p,
.cv article li {
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(10.75, "pt")};
  color: #2A2A2A;
  line-height: 1.5;
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
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(10, "pt")};
  margin: 0;
  line-height: 1.5;
  color: #111111;
}

.cv .skills-grouped li + li {
  margin-top: ${s(0.6, "mm")};
}

.cv .skills-grouped .skill-category {
  font-weight: 700;
  color: #111111;
}

.cv .skills-grouped .skill-name {
  color: #111111;
}

.cv .skills-grouped .skill-level {
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  color: #3A3A3A;
  font-size: ${s(8.7, "pt")};
  margin-left: 0.2em;
  letter-spacing: 0.02em;
}

.cv .languages-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: ${s(1.5, "mm")} ${s(7, "mm")};
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(10, "pt")};
  line-height: 1.5;
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
  color: #3A3A3A;
}

.cv .interests-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: ${s(1.5, "mm")} ${s(4, "mm")};
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(10, "pt")};
  line-height: 1.5;
}

.cv .interests-list li {
  margin: 0;
}


.cv article ul li::marker {
  content: "—  ";
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(15, "pt")};
  color: #000000;
}
.cv .skills-grouped li::marker {
  content: "•  ";
  font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(15.75, "pt")};
  color: #111111;
}

`;
