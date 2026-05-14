import type { AtsMode } from "../types";

const STRICT_CSS = `
.cv, .cv * { color: #000 !important; background: #fff !important; }
.cv { column-count: 1 !important; grid-template-columns: 1fr !important; }
.cv-photo { display: none !important; }
[data-photo] { display: none !important; }
[data-decorative] { display: none !important; }
h1, h2, h3, h4 { font-family: Georgia, "Times New Roman", serif !important; }
body, p, li, span { font-family: Helvetica, Arial, sans-serif !important; }
`.trim();

const BALANCED_CSS = `
[data-decorative] { display: none !important; }
`.trim();

export function atsOverridesCss(mode: AtsMode): string {
  switch (mode) {
    case "ats-strict":
      return STRICT_CSS;
    case "ats-balanced":
      return BALANCED_CSS;
    case "expressive":
    default:
      return "";
  }
}
