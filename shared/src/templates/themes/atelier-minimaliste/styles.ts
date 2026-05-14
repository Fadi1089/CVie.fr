import type { Customization } from "./customization";

export function buildStyles(c: Customization): string {
  const lh = c.density === "compact" ? "1.32" : "1.48";
  const gap = c.density === "compact" ? "7mm" : "10mm";
  return `
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap");
:root { --cv-ink: #16140F; --cv-muted: #6B6357; --cv-rule: #16140F; --cv-line-height: ${lh}; --cv-section-gap: ${gap}; }
@page { size: A4; margin: 18mm 18mm; }
html, body { margin: 0; padding: 0; background: #FFFFFF; color: var(--cv-ink); }
body { font-family: "IBM Plex Sans", system-ui, sans-serif; font-size: 10pt; line-height: var(--cv-line-height); }
.cv { max-width: 158mm; margin: 0 auto; }
.cv-header { padding-bottom: 4mm; border-bottom: 0.5pt solid var(--cv-rule); margin-bottom: 6mm; }
.cv-name { font-size: 20pt; margin: 0; letter-spacing: -0.01em; }
.cv-label { color: var(--cv-muted); margin: 1mm 0 0; font-size: 11pt; }
.cv-meta { margin-top: 3mm; font-family: "IBM Plex Mono", monospace; font-size: 9pt; color: var(--cv-muted); display: flex; gap: 5mm; flex-wrap: wrap; }
.cv-meta a { color: inherit; text-decoration: none; }
.cv-photo { display: none; }
.cv-section-title { font-size: 9pt; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; margin: 0 0 3mm; }
.cv-section { margin-top: var(--cv-section-gap); }
.cv-section-num { display: none; }
.cv-section-rule { display: none; }
.cv-entry { margin-top: 4mm; page-break-inside: avoid; }
.cv-entry-row { display: grid; grid-template-columns: 1fr auto; gap: 6mm; }
.cv-entry-title { font-weight: 700; }
.cv-entry-org { color: var(--cv-muted); }
.cv-entry-dates { font-family: "IBM Plex Mono", monospace; font-size: 9pt; color: var(--cv-muted); }
.cv-bullets { margin: 2mm 0 0; padding-left: 4mm; }
`.trim();
}
