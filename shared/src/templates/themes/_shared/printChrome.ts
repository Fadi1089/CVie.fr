/** Pinned to A4 @ 96 dpi. Match between Playwright viewport and CSS @page
 *  prevents the right-edge clipping bug fixed in the original renderer. */
export const A4_VIEWPORT_PX = { width: 794, height: 1123 } as const;

/** The renderer sets `<html data-fonts-ready="true">` after `document.fonts.ready`
 *  resolves, so themes can use the attribute as a CSS hook if they need to
 *  hold-and-reveal until webfonts settle. */
export const FONT_READY_MARKER = "data-fonts-ready";

export const BASE_PRINT_CSS = `
@page { size: A4; margin: 0; }
html, body { margin: 0; padding: 0; background: white; }
* { box-sizing: border-box; }
img { max-width: 100%; }
/* Print-time: hide preview chrome that themes may have rendered. */
@media print {
  .cv-preview-only { display: none !important; }
}
`.trim();
