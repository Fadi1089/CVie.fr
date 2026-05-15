import type { Customization } from "./customization";

const ACCENT_HEX: Record<string, string> = {
  rust: "#B14E2A",
  sepia: "#8C6A3F",
  aubergine: "#5A2B4D",
  forest: "#2F5141",
  encre: "#22303C",
};

export function buildStyles(c: Customization): string {
  const accent = ACCENT_HEX[c.accent] ?? ACCENT_HEX.rust;
  const lineHeight = c.density === "compact" ? "1.32" : "1.5";
  const sectionGap = c.density === "compact" ? "7mm" : "11mm";
  const photoRadius = c.photoShape === "rounded" ? "6px" : "0";

  return `
@import url("https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght,ital@6..72,400;6..72,500;6..72,700;6..72,400i;6..72,700i&family=Inter+Tight:wght@400;500;700&display=swap");
:root {
  --cv-accent: ${accent};
  --cv-ink: #111111;
  --cv-muted: #6B6357;
  --cv-rule: #1a1a1a;
  --cv-line-height: ${lineHeight};
  --cv-section-gap: ${sectionGap};
  --cv-photo-radius: ${photoRadius};
}
@page { size: A4; margin: 16mm 14mm; }
html, body { margin: 0; padding: 0; background: #FFFFFF; color: var(--cv-ink); }
body { font-family: "Inter Tight", -apple-system, sans-serif; font-size: 10pt; line-height: var(--cv-line-height); }
.cv { max-width: 182mm; margin: 0 auto; display: grid; grid-template-columns: 32% 68%; column-gap: 10mm; }
.cv-header { grid-column: 1 / -1; padding-bottom: 6mm; border-bottom: 0.5pt solid var(--cv-rule); margin-bottom: 8mm; display: grid; grid-template-columns: 1fr auto; gap: 8mm; align-items: end; }
.cv-name { font-family: "Newsreader", Georgia, serif; font-weight: 700; font-size: 32pt; line-height: 1; margin: 0; }
.cv-label { font-family: "Newsreader", Georgia, serif; font-style: italic; font-weight: 400; color: var(--cv-accent); margin: 2mm 0 0; font-size: 14pt; }
.cv-photo { width: 26mm; height: 26mm; object-fit: cover; border-radius: var(--cv-photo-radius); }
.cv-meta { font-size: 9pt; color: var(--cv-muted); display: flex; flex-direction: column; gap: 1mm; text-align: right; }
.cv-section-title { font-family: "Newsreader", Georgia, serif; font-style: italic; font-weight: 700; color: var(--cv-accent); font-size: 13pt; margin: 0 0 3mm; letter-spacing: 0.02em; }
.cv-section { margin-top: var(--cv-section-gap); }
.cv-section-num { display: none; }
.cv-section-rule { display: none; }
.cv-entry { margin-top: 4mm; page-break-inside: avoid; }
.cv-entry-title { font-weight: 700; }
.cv-entry-org { color: var(--cv-muted); }
.cv-entry-dates { font-family: "Inter Tight", monospace; font-size: 9pt; color: var(--cv-muted); }
.cv-bullets { margin: 2mm 0 0; padding-left: 4mm; }
.cv-section-aside { grid-column: 1; }
.cv-section-main { grid-column: 2; }
`.trim();
}
