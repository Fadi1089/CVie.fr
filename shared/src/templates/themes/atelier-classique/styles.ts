export type Customization = {
  accent: "oxblood" | "encre" | "sapin" | "graphite" | "marine";
  density: "compact" | "comfy";
  photoShape: "square" | "rounded" | "circle";
};

const ACCENT_HEX: Record<string, string> = {
  oxblood: "#7B2D26",
  encre: "#1F2937",
  sapin: "#2E4A3A",
  graphite: "#3A3A3A",
  marine: "#1B3A5C",
};

const PHOTO_RADIUS: Record<string, string> = {
  square: "0",
  rounded: "6px",
  circle: "50%",
};

const FONT_IMPORTS = `@import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700&display=swap");`;

export function buildStyles(c: Customization): string {
  const accent = ACCENT_HEX[c.accent] ?? ACCENT_HEX.oxblood;
  const lineHeight = c.density === "compact" ? "1.3" : "1.5";
  const sectionGap = c.density === "compact" ? "8mm" : "12mm";
  const itemGap = c.density === "compact" ? "4mm" : "6mm";
  const photoRadius = PHOTO_RADIUS[c.photoShape] ?? PHOTO_RADIUS.rounded;

  return `
${FONT_IMPORTS}
:root {
  --cv-accent: ${accent};
  --cv-ink: #16140F;
  --cv-muted: #6B6357;
  --cv-paper: #FFFFFF;
  --cv-rule: #1F1B14;
  --cv-line-height: ${lineHeight};
  --cv-section-gap: ${sectionGap};
  --cv-item-gap: ${itemGap};
}
@page { size: A4; margin: 18mm 16mm; }
html, body { margin: 0; padding: 0; background: var(--cv-paper); color: var(--cv-ink); }
body { font-family: "Bricolage Grotesque", "Helvetica Neue", Helvetica, sans-serif; font-size: 10.5pt; line-height: var(--cv-line-height); }
.cv { max-width: 178mm; margin: 0 auto; padding: 0; }
.cv-header { display: grid; grid-template-columns: 1fr auto; gap: 12mm; align-items: end; padding-bottom: 8mm; border-bottom: 1px solid var(--cv-rule); }
.cv-name { font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: 28pt; line-height: 1.05; margin: 0; }
.cv-label { font-family: "Fraunces", Georgia, serif; font-style: italic; color: var(--cv-muted); margin: 2mm 0 0; font-size: 14pt; }
.cv-meta { font-size: 9.5pt; color: var(--cv-muted); display: flex; flex-direction: column; gap: 1mm; text-align: right; }
.cv-meta a { color: inherit; text-decoration: none; }
.cv-photo { width: 28mm; height: 28mm; object-fit: cover; border-radius: ${photoRadius}; }
.cv-section { margin-top: var(--cv-section-gap); }
.cv-section-header { display: flex; align-items: baseline; gap: 6mm; }
.cv-section-num { font-family: "Fraunces", Georgia, serif; font-feature-settings: "tnum"; color: var(--cv-accent); font-size: 13pt; min-width: 8mm; }
.cv-section-title { font-family: "Fraunces", Georgia, serif; font-size: 13pt; margin: 0; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 600; }
.cv-section-rule { flex: 1; height: 1px; background: var(--cv-rule); margin-bottom: 2mm; }
.cv-entry { margin-top: var(--cv-item-gap); page-break-inside: avoid; }
.cv-entry-row { display: flex; justify-content: space-between; gap: 6mm; }
.cv-entry-title { font-weight: 600; }
.cv-entry-org { color: var(--cv-muted); }
.cv-entry-dates { font-family: "Fragment Mono", ui-monospace, "JetBrains Mono", monospace; font-size: 9.5pt; color: var(--cv-muted); white-space: nowrap; }
.cv-bullets { margin: 2mm 0 0; padding-left: 5mm; }
.cv-bullets li { margin: 0.5mm 0; }
.cv-skills-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 3mm 8mm; }
.cv-skill-bucket-name { font-weight: 600; color: var(--cv-accent); }
.cv-skill-keywords { color: var(--cv-ink); }
.cv-ornament { text-align: center; color: var(--cv-accent); letter-spacing: 0.6em; font-size: 9pt; margin: 6mm 0 0; }
`.trim();
}
