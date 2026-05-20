import type { Appearance, Palette } from "../../../types/cv";

const TEXT_ROLE_RANGES = {
  name:    { min: -5, max: 8 },
  label:   { min: -4, max: 6 },
  section: { min: -3, max: 5 },
  title:   { min: -3, max: 5 },
  card:    { min: -3, max: 5 },
  body:    { min: -2, max: 4 },
  meta:    { min: -2, max: 4 },
  fine:    { min: -2, max: 4 },
} as const satisfies Record<string, { min: number; max: number }>;

type TextRole = keyof typeof TEXT_ROLE_RANGES;
const TEXT_ROLES = Object.keys(TEXT_ROLE_RANGES) as readonly TextRole[];

const LH_ROLES = ["tight", "snug", "base"] as const;
type LineHeightRole = (typeof LH_ROLES)[number];
const LH_RANGE = { min: -0.2, max: 0.4 } as const;

const MEDIA_SIZE_MIN = -8;
const MEDIA_SIZE_MAX = 12;
const QR_SIZE_MIN = -8;
const QR_SIZE_MAX = 12;

const SPACE_RANGES = {
  page:    { min: -6, max: 8 },
  section: { min: -3, max: 8 },
  item:    { min: -2, max: 6 },
} as const;
const SPACE_KEY_TO_ROLE = {
  pageMargin: "page",
  sectionGap: "section",
  itemGap:    "item",
} as const;
type SpaceKey = keyof typeof SPACE_KEY_TO_ROLE;
const SPACE_KEYS = Object.keys(SPACE_KEY_TO_ROLE) as readonly SpaceKey[];

const LETTER_SPACING_RANGE = { min: -0.02, max: 0.04 } as const;

const FONT_FAMILY_STACKS = {
  "helvetica-neue": '"Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif',
  "inter":          'Inter, "Helvetica Neue", Arial, sans-serif',
  "georgia":        'Georgia, "Times New Roman", Times, serif',
  "ibm-plex-sans":  '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
} as const satisfies Record<string, string>;
export type FontFamilyKey = keyof typeof FONT_FAMILY_STACKS;
const FONT_FAMILY_KEYS = Object.keys(FONT_FAMILY_STACKS) as readonly FontFamilyKey[];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(min, value));
}

function safeHex(value: string | undefined): string | null {
  return value && HEX_RE.test(value) ? value : null;
}

/**
 * Build a `<style>` block that overrides theme-level CSS variables with the
 * user's appearance settings (palette, text-size deltas, line-height deltas,
 * font family, letter spacing, spacing deltas, media delta).
 *
 * Injected by the renderer AFTER each theme's own `<style data-theme=...>`
 * block so cascade order gives these overrides priority. Themes consume the
 * variables via `var(--cv-accent)` / `calc(... + var(--cv-text-body-delta))`.
 *
 * Returns `""` when there is nothing to override so themes keep their
 * baked-in defaults via cascade.
 */
export function buildAppearanceVarsCss(
  appearance: Appearance | undefined,
  scale = 1,
): string {
  const decls: string[] = [];

  const safeScale =
    Number.isFinite(scale) && scale > 0
      ? Math.min(2, Math.max(0.5, scale))
      : 1;
  if (safeScale !== 1) {
    decls.push(`--cv-scale: ${safeScale};`);
  }

  if (appearance?.palette) {
    decls.push(...paletteDecls(appearance.palette));
  }

  const ts = appearance?.textSizes;
  if (ts) {
    for (const role of TEXT_ROLES) {
      const raw = ts[role];
      if (Number.isFinite(raw)) {
        const range = TEXT_ROLE_RANGES[role];
        decls.push(`--cv-text-${role}-delta: ${clampNumber(raw as number, range.min, range.max)}pt;`);
      }
    }
  }

  if (Number.isFinite(appearance?.mediaSize)) {
    decls.push(`--cv-media-delta: ${clampNumber(appearance!.mediaSize as number, MEDIA_SIZE_MIN, MEDIA_SIZE_MAX)}mm;`);
  }

  if (Number.isFinite(appearance?.qrSize)) {
    decls.push(`--cv-qr-delta: ${clampNumber(appearance!.qrSize as number, QR_SIZE_MIN, QR_SIZE_MAX)}mm;`);
  }

  const spacing = appearance?.spacing;
  if (spacing) {
    for (const key of SPACE_KEYS) {
      const raw = spacing[key];
      if (Number.isFinite(raw)) {
        const range = SPACE_RANGES[SPACE_KEY_TO_ROLE[key]];
        decls.push(`--cv-space-${SPACE_KEY_TO_ROLE[key]}-delta: ${clampNumber(raw as number, range.min, range.max)}mm;`);
      }
    }
  }

  const lh = appearance?.lineHeights;
  if (lh) {
    for (const role of LH_ROLES) {
      const raw = lh[role];
      if (Number.isFinite(raw)) {
        decls.push(`--cv-lh-${role}-delta: ${clampNumber(raw as number, LH_RANGE.min, LH_RANGE.max)};`);
      }
    }
  }

  const typo = appearance?.typography;
  if (typo) {
    const ff = typo.fontFamily;
    if (typeof ff === "string" && (FONT_FAMILY_KEYS as readonly string[]).includes(ff)) {
      decls.push(`--cv-font-family: ${FONT_FAMILY_STACKS[ff as FontFamilyKey]};`);
    }
    if (Number.isFinite(typo.letterSpacing)) {
      decls.push(`--cv-letter-spacing: ${clampNumber(typo.letterSpacing as number, LETTER_SPACING_RANGE.min, LETTER_SPACING_RANGE.max)}em;`);
    }
  }

  if (decls.length === 0) return "";
  return `<style data-appearance>:root{${decls.join("")}}</style>`;
}

function paletteDecls(palette: Palette): string[] {
  const out: string[] = [];
  const channels: ReadonlyArray<{ key: keyof Palette; cssVar: string }> = [
    { key: "accent", cssVar: "--cv-accent" },
    { key: "link",   cssVar: "--cv-link" },
    { key: "ink",    cssVar: "--cv-ink" },
    { key: "soft",   cssVar: "--cv-soft" },
    { key: "rule",   cssVar: "--cv-rule" },
    { key: "canvas", cssVar: "--cv-canvas" },
  ];
  for (const { key, cssVar } of channels) {
    const hex = safeHex(palette[key]);
    if (hex) out.push(`${cssVar}: ${hex};`);
  }
  return out;
}

/**
 * Insert an appearance override `<style>` block right before `</head>` so it
 * wins the cascade against the theme's own `<style data-theme>` block.
 * If there's no `</head>` (defensive: unexpected theme output), prepend
 * the block so it at least lands inside the document.
 */
export function injectAppearanceVars(
  html: string,
  appearance: Appearance | undefined,
  scale = 1,
): string {
  const overrideHtml = buildAppearanceVarsCss(appearance, scale);
  if (!overrideHtml) return html;
  const idx = html.lastIndexOf("</head>");
  if (idx === -1) return overrideHtml + html;
  return html.slice(0, idx) + overrideHtml + html.slice(idx);
}
