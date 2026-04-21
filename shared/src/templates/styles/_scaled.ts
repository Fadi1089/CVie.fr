/**
 * CV template density-scale helper.
 *
 * Usage:
 *   import { s } from "./_scaled";
 *   `.cv header h1 { font-size: ${s(22, "pt")}; margin-bottom: ${s(1.5, "mm")}; }`
 *
 * Expands to:
 *   `.cv header h1 { font-size: calc(22pt * var(--cv-scale, 1)); ... }`
 *
 * The `--cv-scale` custom property is set by the renderer:
 *   - At render time via `renderCvHtml(data, template, scale)` → inline style
 *     on <html>, so PDF exports bake the scale into the document.
 *   - At runtime via the pagination script's `cv-scale` postMessage listener,
 *     so the editor slider rescales the preview without re-rendering.
 *
 * The `, 1` fallback means templates still render sanely if a caller forgets
 * to emit the property.
 *
 *
 * ============================================================================
 * TEMPLATE AUTHORING RULES — READ BEFORE ADDING OR EDITING A TEMPLATE
 * ============================================================================
 *
 * Rule 1 — WRAP (use `s()`):
 *   Every absolute-unit length that describes CONTENT typography or spacing:
 *     - font-size (pt)
 *     - margin, margin-*, padding, padding-*, gap
 *     - border-width, border-radius
 *     - width/height of decorative elements (photo, avatar, icon, badge)
 *     - max-width of inline content
 *     - box-shadow offsets + blur
 *     - text-underline-offset, text-decoration-thickness
 *     - letter-spacing ONLY when expressed in pt/px (prefer em — see Rule 3)
 *
 * Rule 2 — DO NOT WRAP (leave literal):
 *   Anything that belongs to page geometry or preview chrome:
 *     - `@page { size / margin }`
 *     - `.cv { width / min-height / padding }` (owned by BASE_PAGE_CSS —
 *       templates should not redeclare these at all)
 *     - `.cv-paginated { width }`
 *     - `.cv-page-bg { width / height / top }`
 *     - `.cv-canvas { padding }`
 *     - `.cv-page-advisory` positioning and gap-related mm values
 *   Also: colors (rgba/hex/oklch), opacity, percentages, ratios.
 *
 * Rule 3 — RELATIVE UNITS ARE AUTOMATIC:
 *   Do not wrap em, rem, %, or unitless values. They resolve against the
 *   nearest scaled font-size, so wrapping them would double-scale.
 *   Prefer unitless line-heights (`1.45`) and em-based inline paddings
 *   (`padding-left: 1.1em`) — they scale for free.
 *
 * Rule 4 — RULE OF THUMB when you're not sure:
 *   If the value describes "how big is this piece of content?" → wrap.
 *   If the value describes "where is a page boundary or backdrop?" → leave.
 *
 * Rule 5 — TESTING:
 *   After editing a template, open the editor, drag the density slider to
 *   70% and 85%, and visually diff the preview against 100%. Every piece of
 *   text and spacing should shrink uniformly. A value that stays constant
 *   while its neighbours shrink is a missed `s()` wrap.
 */

type AbsoluteUnit = "pt" | "mm" | "in" | "px";

export function s(value: number, unit: AbsoluteUnit): string {
  return `calc(${value}${unit} * var(--cv-scale, 1))`;
}
