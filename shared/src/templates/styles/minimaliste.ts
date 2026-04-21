import { s } from "./_scaled";

/**
 * Minimaliste CV template — "Ligne Claire".
 *
 * Swiss-grid / brutalist-minimal: pure ink on paper, zero ornament, 3-col
 * entry grid (date / title / place), mono dates for tabular alignment,
 * section headings anchored by a 2px left border (no absolute-positioned
 * spines, no CSS counters, no pseudo-element text). Photo hidden —
 * consistent with FR anti-discrimination recommendations and the
 * typography-only aesthetic.
 *
 * Display: Archivo (Google Fonts) — variable sans with narrow optical size
 *   for section headings.
 * Body: Inter Tight (Google Fonts) — tighter counterpart to Inter for
 *   denser body rhythm.
 * Mono: JetBrains Mono (Google Fonts) — dates only, gives the entry grid
 *   a tabular anchor no proportional font can match.
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
 *   - Screen and print use identical .cv padding (no compensation resets)
 *   - ATS: no position:absolute text, no pseudo-element text content
 */
export const minimalisteCss = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

@page {
  size: A4;
  margin: 0;
}

.cv-canvas {
  background: #ececec;
  padding: 24px 0 8px;
  font-family: "Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif;
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
    0 0 0 0.5pt rgba(17, 17, 17, 0.18),
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
  font-family: "Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 9pt;
  line-height: 1.5;
  color: #555555;
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
  background: linear-gradient(to right, transparent, rgba(17, 17, 17, 0.3), transparent);
}

.cv-page-advisory .cv-page-advisory-text {
  font-style: italic;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.cv-page-advisory .cv-page-advisory-text strong {
  font-weight: 700;
  font-style: normal;
  color: #111111;
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
  color: #111111;
  font-family: "Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(10.5, "pt")};
  line-height: 1.45;
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
  text-decoration-thickness: ${s(0.4, "pt")};
  text-underline-offset: ${s(2, "px")};
}

.cv ul {
  margin: 0.3em 0 0 0;
  padding-left: 1.1em;
}

.cv li {
  margin-bottom: 0.2em;
}

/* Header — name left, job title right-aligned on same baseline.
   Single hairline rule. Contact row in tracked uppercase 8pt. */
.cv header {
  margin-bottom: ${s(6, "mm")};
  padding-bottom: ${s(3, "mm")};
  border-bottom: ${s(0.5, "pt")} solid #111111;
}

.cv header .header-top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${s(6, "mm")};
}

.cv header:not(.has-photo) .header-top {
  gap: 0;
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
  margin: 0 0 ${s(1.5, "mm")} 0;
  font-family: "Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(22, "pt")};
  font-weight: 500;
  color: #111111;
  letter-spacing: -0.02em;
  line-height: 1.05;
}

.cv header .job-title {
  margin: 0 0 ${s(2, "mm")} 0;
  font-family: "Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(9, "pt")};
  font-weight: 400;
  color: #555555;
  text-transform: uppercase;
  letter-spacing: 0.22em;
}

.cv header .contact {
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: ${s(8, "pt")};
  color: #555555;
  font-weight: 400;
  letter-spacing: 0.02em;
}

.cv header .contact li {
  display: inline-block;
  margin: 0;
}

.cv header .contact li + li::before {
  content: "/";
  margin: 0 0.5em;
  color: #a0a0a0;
}

.cv header .summary {
  /* Description/summary must span full content width, respecting only the
     renderer-owned page margins. No max-width cap. */
  margin: ${s(3.5, "mm")} 0 0 0;
  font-size: ${s(10, "pt")};
  line-height: 1.55;
  color: #2a2a2a;
}

.cv section {
  margin-bottom: ${s(5, "mm")};
}

/* H2 — Archivo uppercase with left 2px rule.
   12pt keeps clear hierarchy vs 10.5pt body — fixes the size-collapse
   flagged in review. Border-left replaces the absolute-positioned spine
   and CSS counter from the prior revision. */
.cv section h2 {
  margin: 0 0 ${s(3, "mm")} 0;
  padding: ${s(0.5, "mm")} 0 ${s(0.5, "mm")} ${s(4, "mm")};
  font-family: "Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(12, "pt")};
  font-weight: 600;
  color: #111111;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  border-left: ${s(2, "pt")} solid #111111;
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

/* Entry header — 2-col grid: title/place row flex.
   Date in mono, italic for hierarchy. */
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
  font-family: "Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: ${s(11, "pt")};
  font-weight: 600;
  color: #111111;
  letter-spacing: -0.005em;
}

.cv article .entry-meta {
  margin: 0;
  font-family: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: ${s(8.5, "pt")};
  font-weight: 400;
  color: #6b6b6b;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.cv article .entry-sub {
  margin: 0 0 ${s(1, "mm")} 0;
  font-size: ${s(10, "pt")};
  color: #333333;
  font-style: italic;
  page-break-after: avoid;
  break-after: avoid;
}

.cv article .entry-description {
  /* Full content width, inherits .cv padding as margin */
  margin: ${s(1, "mm")} 0 0 0;
  font-size: ${s(10, "pt")};
  color: #222222;
}

.cv article ul {
  list-style: none;
  padding-left: 0;
}

.cv article li {
  position: relative;
  padding-left: ${s(3.5, "mm")};
}

.cv article li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: ${s(1.4, "mm")};
  height: ${s(1.4, "mm")};
  background: #111111;
}

/* Skills — disc-bulleted list grouped per category. Minimal palette:
   black category label, neutral names, muted level hint. */
.cv .skills-grouped {
  list-style: disc;
  margin: 0;
  padding-left: ${s(5, "mm")};
  font-size: ${s(10, "pt")};
  line-height: 1.55;
}

.cv .skills-grouped li {
  margin: 0;
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
  font-weight: 500;
  color: #111111;
}

.cv .skills-grouped .skill-level {
  color: #6b6b6b;
  font-style: italic;
  font-size: ${s(9.5, "pt")};
  margin-left: 0.2em;
}

.cv .languages-list {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: ${s(10, "pt")};
  line-height: 1.7;
}

.cv .languages-list li {
  display: inline;
  margin: 0;
}

.cv .languages-list li + li::before {
  content: ", ";
  color: #6b6b6b;
}

.cv .languages-list .lang-name {
  font-weight: 600;
}

.cv .languages-list .lang-level {
  color: #6b6b6b;
  font-style: italic;
  margin-left: 0.3em;
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
  content: ", ";
  color: #6b6b6b;
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
