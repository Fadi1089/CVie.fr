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
 *       (for templates using the per-role spacing system, prefer
 *       `sSpace(value, unit, role)` instead — classified as "page" for outer
 *       page padding, "section" for gaps between top-level content blocks, or
 *       "item" for gaps between entries inside a section. `s()` remains valid
 *       for any site that doesn't fit a role bucket.)
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
 *   Exception: use `sLine(value)` on `line-height` declarations for content
 *   text when you need a user-adjustable additive delta — `sLine()` is the
 *   line-height equivalent of `sSpace()`.
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

export type TextRole = "paragraph" | "header" | "title";

/**
 * Scale a text length by both the global density (`--cv-scale`) AND a
 * per-role pt delta (`--cv-text-<role>-delta`, default `0pt`). The delta
 * lets users grow/shrink a single typographic role from the Design tab
 * without disturbing the rest of the document.
 *
 * Example:
 *   font-size: ${sText(10, "pt", "paragraph")};
 *   → calc(10pt * var(--cv-scale, 1) + var(--cv-text-paragraph-delta, 0pt))
 *
 * Use only on `font-size` declarations. Margins, line-heights, and
 * decorative widths should keep using `s()` so they don't drift away
 * from the surrounding rhythm when text grows.
 */
export function sText(value: number, unit: AbsoluteUnit, role: TextRole): string {
  return `calc(${value}${unit} * var(--cv-scale, 1) + var(--cv-text-${role}-delta, 0pt))`;
}

/**
 * Scale a media length (header photo, QR box) by density AND the user's
 * mm delta. Wraps the SAME width AND height of any media element — never
 * mix `sMedia()` for one axis and `s()` for the other; the photo/QR are
 * intentionally square and the delta would skew them.
 */
export function sMedia(value: number, unit: AbsoluteUnit): string {
  return `calc(${value}${unit} * var(--cv-scale, 1) + var(--cv-media-delta, 0mm))`;
}

export type SpaceRole = "page" | "section" | "item";

/**
 * Scale a spatial spacing value (margin, padding, gap) by both the global
 * density (`--cv-scale`) AND a per-role mm delta
 * (`--cv-space-<role>-delta`, default `0mm`). The delta lets users
 * tighten or loosen a single spatial role from the Design tab without
 * disturbing the rest of the document.
 *
 * Example:
 *   margin-bottom: ${sSpace(5.2917, "mm", "section")};
 *   → calc(5.2917mm * var(--cv-scale, 1) + var(--cv-space-section-delta, 0mm))
 *
 * Roles:
 *   - "page"    — outer page padding (space between content and page edge)
 *   - "section" — gaps between top-level content blocks
 *   - "item"    — gaps between entries inside a section
 *
 * Use instead of `s()` wherever a margin/padding/gap value belongs to one
 * of the three roles above. Keep `s()` for any spacing that doesn't fit a
 * role bucket (decorative borders, avatar sizes, etc.).
 */
export function sSpace(value: number, unit: AbsoluteUnit, role: SpaceRole): string {
  return `calc(${value}${unit} * var(--cv-scale, 1) + var(--cv-space-${role}-delta, 0mm))`;
}

/**
 * Add a unitless additive delta to a baseline line-height value. The delta
 * (`--cv-line-height-delta`, default `0`) lets users open up or compress
 * line spacing across all content text from the Design tab.
 *
 * Example:
 *   line-height: ${sLine(1.45)};
 *   → calc(1.45 + var(--cv-line-height-delta, 0))
 *
 * Use only on `line-height` declarations on content text (paragraphs,
 * section entries) — not on chrome elements (page header, page number,
 * advisory overlays). Line-height baselines are unitless multipliers, so
 * the delta is also unitless; do not append a unit.
 *
 * This is the line-height equivalent of `sSpace()`.
 */
export function sLine(value: number): string {
  return `calc(${value} + var(--cv-line-height-delta, 0))`;
}
