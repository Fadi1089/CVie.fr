import { z } from "zod";

export const FIGMA_TEMPLATE_NAMESPACE = "cvie.templates";
export const DEFAULT_FIGMA_TEMPLATE_FILE_KEY = "25iovEf8CZdNuAlo8n9P1h";

export const templateIds = ["classique", "moderne", "minimaliste"] as const;
export type FigmaTemplateId = (typeof templateIds)[number];

const requiredCriticalRoles = [
  "template",
  "header",
  "text.name",
  "text.headline",
  "text.summary",
] as const;

const requiredSectionIds = [
  "formations",
  "experiences",
  "skills",
  "languages",
  "interests",
] as const;

const supportedFontFamilies = [
  "Newsreader",
  "Inter",
  "Fraunces",
  "IBM Plex Sans",
  "Archivo",
  "JetBrains Mono",
] as const;

const cssExportsByTemplate = {
  classique: "classiqueCss",
  moderne: "moderneCss",
  minimaliste: "minimalisteCss",
} satisfies Record<FigmaTemplateId, string>;

const fontImportsByTemplate = {
  classique:
    "@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600;6..72,700;6..72,800&family=Inter:wght@400;500;600&display=swap');",
  moderne:
    "@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500;1,9..144,600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');",
  minimaliste:
    "@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');",
} satisfies Record<FigmaTemplateId, string>;

const fallbackStacks = {
  Newsreader:
    '"Newsreader", "Source Serif 4", "Charter", Georgia, "Times New Roman", serif',
  Inter:
    '"Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
  Fraunces: '"Fraunces", "Newsreader", Georgia, serif',
  "IBM Plex Sans": '"IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
  Archivo: '"Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif',
  "JetBrains Mono": '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
} satisfies Record<SupportedFontFamily, string>;

type SupportedFontFamily = (typeof supportedFontFamilies)[number];

const templateIdSchema = z.enum(templateIds);
const fontFamilySchema = z.enum(supportedFontFamilies);

const boxSchema = z.object({
  top: z.number(),
  right: z.number(),
  bottom: z.number(),
  left: z.number(),
});

const radiiSchema = z.object({
  topLeft: z.number().nonnegative(),
  topRight: z.number().nonnegative(),
  bottomLeft: z.number().nonnegative(),
  bottomRight: z.number().nonnegative(),
});

const typographySchema = z.object({
  nodeId: z.string(),
  fontFamily: fontFamilySchema,
  fontStyle: z.string(),
  fontWeight: z.number(),
  fontSizePt: z.number().positive(),
  lineHeight: z.number().positive(),
  letterSpacingEm: z.number(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  textTransform: z.enum(["none", "uppercase"]).default("none"),
  // Fixed-height TEXT frames carry an explicit layout slot (frame height) that
  // is independent of the rendered line-box. When set, CSS emits an explicit
  // `height` so vertical flow matches Figma px-for-px while the line-box stays
  // at the intrinsic `lineHeight` to keep glyphs in-bounds.
  frameHeightMm: z.number().positive().optional(),
});

const layoutSchema = z.object({
  pagePaddingMm: boxSchema,
  rootGapMm: z.number().nonnegative(),
  headerGapMm: z.number().nonnegative(),
  headerPaddingBottomMm: z.number().nonnegative(),
  headerMarginBottomMm: z.number().nonnegative(),
  headerBorderBottomWeightPt: z.number().nonnegative(),
  headerIdentityBorderLeftWeightPt: z.number().nonnegative(),
  headerIdentityBorderRadiiMm: radiiSchema,
  headerIdentityPaddingMm: boxSchema,
  headerIdentityItemSpacingMm: z.number().nonnegative(),
  headerSummaryGapMm: z.number().nonnegative(),
  photoSizeMm: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  photoStrokeWeightPt: z.number().nonnegative(),
  photoBorderRadiusMm: z.number().nonnegative(),
  portfolioQrSizeMm: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  portfolioQrStrokeWeightPt: z.number().nonnegative(),
  portfolioQrRadiusMm: z.number().nonnegative(),
  sectionGapMm: z.number().nonnegative(),
  sectionPaddingBottomMm: z.number().nonnegative(),
  sectionTitleBorderWeightPt: z.number().nonnegative(),
  sectionTitleBorderRadiiMm: radiiSchema,
  sectionTitleMarginBottomMm: z.number().nonnegative(),
  sectionTitlePaddingMm: boxSchema,
  entryGapMm: z.number().nonnegative(),
  entryHeaderGapMm: z.number().nonnegative(),
});

const colorSchema = z.object({
  canvasBackground: z.string().regex(/^#[0-9a-f]{6}$/i),
  pageBackground: z.string().regex(/^#[0-9a-f]{6}$/i),
  text: z.string().regex(/^#[0-9a-f]{6}$/i),
  muted: z.string().regex(/^#[0-9a-f]{6}$/i),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i),
  rule: z.string().regex(/^#[0-9a-f]{6}$/i),
  photoBackground: z.string().regex(/^#[0-9a-f]{6}$/i),
  photoBorder: z.string().regex(/^#[0-9a-f]{6}$/i),
  portfolioQrBackground: z.string().regex(/^#[0-9a-f]{6}$/i),
  portfolioQrBorder: z.string().regex(/^#[0-9a-f]{6}$/i),
});

const sectionSchema = z.object({
  id: z.enum(requiredSectionIds),
  nodeId: z.string(),
  titleNodeId: z.string().optional(),
});

const bulletSchema = z.object({
  glyph: z.string().min(1),
  fontFamily: fontFamilySchema,
  fontSizePt: z.number().positive(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
});

export const figmaTemplateDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  id: templateIdSchema,
  name: z.string().min(1),
  source: z.object({
    fileKey: z.string().min(1),
    pageId: z.string().min(1),
    pageName: z.string().min(1),
    rootNodeId: z.string().min(1),
  }),
  sourceNodeIds: z.record(z.string(), z.array(z.string())),
  page: z.object({
    widthPx: z.number().positive(),
    heightPx: z.number().positive(),
  }),
  colors: colorSchema,
  typography: z.object({
    body: typographySchema,
    name: typographySchema,
    headline: typographySchema,
    contact: typographySchema,
    summary: typographySchema,
    sectionTitle: typographySchema,
    entryTitle: typographySchema,
    entryDate: typographySchema,
    entryMeta: typographySchema,
    entryBody: typographySchema,
    listItem: typographySchema,
    portfolioQrLabel: typographySchema,
  }),
  layout: layoutSchema,
  bullets: z
    .object({
      entry: bulletSchema.optional(),
      skills: bulletSchema.optional(),
    })
    .optional(),
  sections: z.array(sectionSchema).length(requiredSectionIds.length),
});

export type FigmaTemplateDefinition = z.infer<
  typeof figmaTemplateDefinitionSchema
>;

type FigmaPaint = {
  type?: string;
  color?: { r: number; g: number; b: number };
  opacity?: number;
  visible?: boolean;
};

type FigmaNode = {
  id?: string;
  name?: string;
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  absoluteBoundingBox?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  layoutMode?: string;
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  fills?: FigmaPaint[] | unknown;
  strokes?: FigmaPaint[] | unknown;
  strokeWeight?: number;
  strokeTopWeight?: number;
  strokeRightWeight?: number;
  strokeBottomWeight?: number;
  strokeLeftWeight?: number;
  individualStrokeWeights?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomLeftRadius?: number;
  bottomRightRadius?: number;
  characters?: string;
  layoutSizingVertical?: string;
  layoutSizingHorizontal?: string;
  textAutoResize?: string;
  style?: {
    fontFamily?: string;
    fontPostScriptName?: string;
    fontWeight?: number;
    fontSize?: number;
    lineHeightPercent?: number;
    lineHeightPx?: number;
    letterSpacing?: number;
    letterSpacingPercent?: number;
    textCase?: string;
  };
  characterStyleOverrides?: number[];
  styleOverrideTable?: Record<
    string,
    {
      fontSize?: number;
      fontFamily?: string;
      fontPostScriptName?: string;
      fontWeight?: number;
    }
  >;
  sharedPluginData?: Record<string, Record<string, string>>;
  pluginData?: {
    shared?: Record<string, Record<string, string>>;
  };
  children?: FigmaNode[];
};

type FigmaFile = {
  name?: string;
  document?: FigmaNode;
};

export function extractTemplateDefinitionsFromFigmaFile(
  file: unknown,
  fileKey: string,
): FigmaTemplateDefinition[] {
  const figmaFile = file as FigmaFile;
  const pages = figmaFile.document?.children ?? [];
  const definitions: FigmaTemplateDefinition[] = [];

  for (const page of pages) {
    const roots = (page.children ?? []).filter(
      (node) => sharedData(node).role === "template",
    );
    if (roots.length === 0) continue;
    if (roots.length > 1) {
      throw new Error(
        `${page.name ?? page.id}: expected exactly 1 role template, got ${roots.length}`,
      );
    }

    definitions.push(extractTemplateDefinition(roots[0]!, page, fileKey));
  }

  if (definitions.length === 0) {
    throw new Error("No normalized CV templates found in Figma file");
  }

  return definitions.map(validateTemplateDefinition);
}

export function validateTemplateDefinition(
  definition: unknown,
): FigmaTemplateDefinition {
  const parsed = figmaTemplateDefinitionSchema.parse(definition);
  assertA4Size(parsed);
  const expected = new Set(requiredSectionIds);
  for (const section of parsed.sections) expected.delete(section.id);
  if (expected.size > 0) {
    throw new Error(
      `Template ${parsed.id}: missing required section ${Array.from(expected).join(", ")}`,
    );
  }
  return parsed;
}

/**
 * Maps a Figma template `colors` block onto the 5-channel palette consumed
 * by the renderer's `:root` override and the Design tab. The mapping is:
 *
 *   accent → colors.accent      (links, header bar, h2 bar, decorative borders)
 *   ink    → colors.text        (body text, headings)
 *   soft   → colors.muted       (meta, dates, captions)
 *   rule   → colors.rule        (separator borders)
 *   canvas → colors.canvasBackground  (page surround)
 *
 * Hex values are normalized to uppercase to match the codebase's hand-authored
 * style — Figma emits lowercase but the .ts files use uppercase.
 */
export function paletteFromFigmaColors(
  colors: FigmaTemplateDefinition["colors"],
): { accent: string; ink: string; soft: string; rule: string; canvas: string } {
  const up = (hex: string) => hex.toUpperCase();
  return {
    accent: up(colors.accent),
    ink: up(colors.text),
    soft: up(colors.muted),
    rule: up(colors.rule),
    canvas: up(colors.canvasBackground),
  };
}

/**
 * Generates the `_palettes.generated.ts` module aggregating each template's
 * default palette. Written by the figma sync script so changing colors in
 * Figma propagates into the registry's `defaultPalette` field — which the
 * Design tab's "Réinitialiser" button restores.
 */
export function generatePaletteModule(
  definitions: readonly FigmaTemplateDefinition[],
): string {
  const byId = new Map(definitions.map((d) => [d.id, d]));
  const lines: string[] = [
    "/**",
    " * @generated from Figma template colors via `bun run sync:figma-templates`.",
    " * Do not edit by hand. Maps each template's Figma `colors` object onto the",
    " * 5-channel palette consumed by the Design tab and renderer overrides.",
    " *",
    " * Channel mapping:",
    " *   accent → colors.accent",
    " *   ink    → colors.text",
    " *   soft   → colors.muted",
    " *   rule   → colors.rule",
    " *   canvas → colors.canvasBackground",
    " */",
    "",
    'import type { Palette } from "../../types/cv";',
    "",
    "export const defaultPalettes = {",
  ];
  for (const id of templateIds) {
    const def = byId.get(id);
    if (!def) {
      throw new Error(`generatePaletteModule: missing definition for ${id}`);
    }
    const p = paletteFromFigmaColors(def.colors);
    lines.push(`  ${id}: {`);
    lines.push(`    accent: "${p.accent}",`);
    lines.push(`    ink: "${p.ink}",`);
    lines.push(`    soft: "${p.soft}",`);
    lines.push(`    rule: "${p.rule}",`);
    lines.push(`    canvas: "${p.canvas}",`);
    lines.push(`  },`);
  }
  lines.push(
    `} as const satisfies Record<"classique" | "moderne" | "minimaliste", Palette>;`,
  );
  lines.push("");
  return lines.join("\n");
}

export function generateStyleModule(definition: FigmaTemplateDefinition): string {
  const def = validateTemplateDefinition(definition);
  const exportName = cssExportsByTemplate[def.id];
  return [
    'import { s } from "./_scaled";',
    "",
    "/**",
    ` * @generated from Figma template ${def.name}.`,
    " * Do not edit by hand; run `bun run generate:template-css`.",
    " */",
    `export const ${exportName} = \``,
    generateTemplateCss(def),
    "`;",
    "",
  ].join("\n");
}

export function generateTemplateCss(definition: FigmaTemplateDefinition): string {
  const def = validateTemplateDefinition(definition);
  const body = def.typography.body;
  const name = def.typography.name;
  const headline = def.typography.headline;
  const contact = def.typography.contact;
  const summary = def.typography.summary;
  const sectionTitle = def.typography.sectionTitle;
  const entryTitle = def.typography.entryTitle;
  const entryDate = def.typography.entryDate;
  const entryMeta = def.typography.entryMeta;
  const entryBody = def.typography.entryBody;
  const listItem = def.typography.listItem;
  const portfolioQrLabel = def.typography.portfolioQrLabel;
  const sectionRule = def.id === "classique";
  const entryBulletCss = bulletMarkerCss(
    ".cv article ul li",
    def.bullets?.entry,
  );
  const skillsBulletCss = bulletMarkerCss(
    ".cv .skills-grouped li",
    def.bullets?.skills,
  );
  const photoCss =
    def.id === "minimaliste"
      ? `.cv header .photo {\n  display: none;\n}`
      : `.cv header .photo {\n  flex-shrink: 0;\n  width: ${scale(def.layout.photoSizeMm.width, "mm")};\n  height: ${scale(def.layout.photoSizeMm.height, "mm")};\n  object-fit: cover;\n  object-position: ${def.id === "moderne" ? "center top" : "center 22%"};\n  border-radius: ${scale(def.layout.photoBorderRadiusMm, "mm")};\n  display: block;\n  background: ${def.colors.photoBackground};\n  box-sizing: border-box;\n  border: ${scale(def.layout.photoStrokeWeightPt, "pt")} solid ${def.colors.photoBorder};\n}`;

  const css = `${fontImportsByTemplate[def.id]}

@page {
  size: A4;
  margin: 0;
  background: ${def.colors.pageBackground};
}

.cv-canvas {
  background: ${def.colors.canvasBackground};
  padding: 24px 0 8px;
  font-family: ${fontStack(body.fontFamily)};
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
  background: ${def.colors.pageBackground};
  box-shadow:
    0 0 0 0.5pt ${shadowColor(def.colors.accent, 0.16)},
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
  font-family: ${fontStack(body.fontFamily)};
  font-size: 9pt;
  line-height: 1.5;
  color: ${def.colors.muted};
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
  background: linear-gradient(to right, transparent, ${shadowColor(def.colors.accent, 0.3)}, transparent);
}

.cv-page-advisory .cv-page-advisory-text {
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.cv-page-advisory .cv-page-advisory-text strong {
  font-weight: 700;
  color: ${def.colors.accent};
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
  color: ${def.colors.text};
  font-family: ${fontStack(body.fontFamily)};
  font-size: ${scale(body.fontSizePt, "pt")};
  line-height: ${fmt(body.lineHeight)};
  orphans: 3;
  widows: 3;
}

.cv *,
.cv *::before,
.cv *::after {
  box-sizing: inherit;
}

.cv a {
  color: ${def.id === "moderne" || def.id === "minimaliste" ? def.colors.text : def.colors.accent};
  text-decoration: ${def.id === "classique" ? "none" : "underline"};
  text-decoration-color: ${def.colors.accent};
  text-decoration-thickness: ${scale(def.id === "minimaliste" ? 0.4 : 0.5, "pt")};
  text-underline-offset: ${scale(2, "px")};
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
  margin-bottom: ${scale(def.layout.headerMarginBottomMm, "mm")};
  padding-bottom: ${scale(def.layout.headerPaddingBottomMm, "mm")};
  border-bottom: ${scale(def.layout.headerBorderBottomWeightPt, "pt")} solid ${def.id === "classique" ? def.colors.rule : def.colors.accent};
}

.cv header .header-top {
  display: flex;
  align-items: ${def.id === "classique" ? "center" : "flex-end"};
  justify-content: ${def.id === "classique" ? "flex-start" : "space-between"};
  gap: ${scale(def.layout.headerGapMm, "mm")};
}

.cv header:not(.has-photo) .header-top {
  gap: 0;
}

.cv header .header-identity {
  position: relative;
  flex: 1;
  min-width: 0;
  padding: ${scale(def.layout.headerIdentityPaddingMm.top, "mm")} ${scale(def.layout.headerIdentityPaddingMm.right, "mm")} ${scale(def.layout.headerIdentityPaddingMm.bottom, "mm")} ${scale(def.layout.headerIdentityPaddingMm.left, "mm")};
}

${
  def.layout.headerIdentityBorderLeftWeightPt > 0
    ? `.cv header .header-identity::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${scale(def.layout.headerIdentityBorderLeftWeightPt, "pt")};
  background: ${def.colors.accent};
  border-radius: ${scale(def.layout.headerIdentityBorderRadiiMm.topLeft, "mm")} ${scale(def.layout.headerIdentityBorderRadiiMm.topRight, "mm")} ${scale(def.layout.headerIdentityBorderRadiiMm.bottomRight, "mm")} ${scale(def.layout.headerIdentityBorderRadiiMm.bottomLeft, "mm")};
}`
    : ""
}

${photoCss}

.cv .portfolio-qr-box {
  width: ${scale(def.layout.portfolioQrSizeMm.width, "mm")};
  height: ${scale(def.layout.portfolioQrSizeMm.height, "mm")};
  border-radius: ${scale(def.layout.portfolioQrRadiusMm, "mm")};
  background: ${def.colors.portfolioQrBackground};
  box-sizing: border-box;
  border: ${scale(def.layout.portfolioQrStrokeWeightPt, "pt")} solid ${def.colors.portfolioQrBorder};
  overflow: hidden;
}

.cv .portfolio-qr-box img {
  width: 100%;
  height: 100%;
  display: block;
}

.cv .portfolio-qr-label {
  font-family: ${fontStack(portfolioQrLabel.fontFamily)};
  font-size: ${scale(portfolioQrLabel.fontSizePt, "pt")};
  font-weight: ${portfolioQrLabel.fontWeight};
  line-height: ${fmt(portfolioQrLabel.lineHeight)};
  letter-spacing: ${fmt(portfolioQrLabel.letterSpacingEm)}em;
  color: ${portfolioQrLabel.color};
  text-transform: ${portfolioQrLabel.textTransform};
}

.cv header h1 {
  margin: 0 0 ${scale(def.layout.headerIdentityItemSpacingMm, "mm")} 0;
  font-family: ${fontStack(name.fontFamily)};
  font-size: ${scale(name.fontSizePt, "pt")};
  font-weight: ${name.fontWeight};
  color: ${name.color};
  letter-spacing: ${fmt(name.letterSpacingEm)}em;
  line-height: ${fmt(name.lineHeight)};
  font-style: ${fontStyle(name)};${frameHeightDecl(name)}
}

.cv header .job-title {
  margin: 0 0 ${scale(def.layout.headerIdentityItemSpacingMm, "mm")} 0;
  font-family: ${fontStack(headline.fontFamily)};
  font-size: ${scale(headline.fontSizePt, "pt")};
  font-weight: ${headline.fontWeight};
  color: ${headline.color};
  text-transform: uppercase;
  letter-spacing: ${fmt(headline.letterSpacingEm)}em;
  line-height: ${fmt(headline.lineHeight)};${frameHeightDecl(headline)}
}

.cv header .contact {
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: ${fontStack(contact.fontFamily)};
  font-size: ${scale(contact.fontSizePt, "pt")};
  color: ${contact.color};
  line-height: ${fmt(contact.lineHeight)};
  letter-spacing: ${fmt(contact.letterSpacingEm)}em;${frameHeightDecl(contact)}
}

.cv header .contact li {
  display: inline-block;
  margin: 0 ${scale(2, "mm")} 0 0;
}

.cv header .contact li + li::before {
  content: none;
}

.cv header .contact a {
  color: ${def.colors.text};
}

.cv header .summary {
  margin: ${scale(def.layout.headerSummaryGapMm, "mm")} 0 0 0;
  font-family: ${fontStack(summary.fontFamily)};
  font-size: ${scale(summary.fontSizePt, "pt")};
  line-height: ${fmt(summary.lineHeight)};
  color: ${summary.color};
  font-style: ${fontStyle(summary)};
}

.cv section {
  margin-bottom: ${scale(def.layout.sectionGapMm, "mm")};
  ${sectionRule ? `padding-bottom: ${scale(def.layout.sectionPaddingBottomMm, "mm")};\n  border-bottom: ${scale(0.5, "pt")} solid ${def.colors.rule};` : ""}
}

.cv section:last-of-type {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.cv section h2 {
  position: relative;
  margin: 0 0 ${scale(def.layout.sectionTitleMarginBottomMm, "mm")} 0;
  padding: ${scale(def.layout.sectionTitlePaddingMm.top, "mm")} ${scale(def.layout.sectionTitlePaddingMm.right, "mm")} ${scale(def.layout.sectionTitlePaddingMm.bottom, "mm")} ${scale(def.layout.sectionTitlePaddingMm.left, "mm")};
  font-family: ${fontStack(sectionTitle.fontFamily)};
  font-size: ${scale(sectionTitle.fontSizePt, "pt")};
  font-weight: ${sectionTitle.fontWeight};
  color: ${sectionTitle.color};
  letter-spacing: ${fmt(sectionTitle.letterSpacingEm)}em;
  line-height: ${fmt(sectionTitle.lineHeight)};
  font-style: ${fontStyle(sectionTitle)};
  ${def.id === "moderne" ? `border-bottom: ${scale(def.layout.sectionTitleBorderWeightPt, "pt")} solid ${def.colors.accent};` : ""}
  page-break-after: avoid;
  break-after: avoid;
}

${
  def.id !== "moderne" && def.layout.sectionTitleBorderWeightPt > 0
    ? `.cv section h2::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${scale(def.layout.sectionTitleBorderWeightPt, "pt")};
  background: ${def.colors.accent};
  border-radius: ${scale(def.layout.sectionTitleBorderRadiiMm.topLeft, "mm")} ${scale(def.layout.sectionTitleBorderRadiiMm.topRight, "mm")} ${scale(def.layout.sectionTitleBorderRadiiMm.bottomRight, "mm")} ${scale(def.layout.sectionTitleBorderRadiiMm.bottomLeft, "mm")};
}`
    : ""
}

.cv article {
  margin-bottom: ${scale(def.layout.entryGapMm, "mm")};
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
  gap: ${scale(def.layout.entryHeaderGapMm, "mm")};
  margin-bottom: ${scale(0.6, "mm")};
  page-break-after: avoid;
  break-after: avoid;
}

.cv article h3 {
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
  font-family: ${fontStack(entryTitle.fontFamily)};
  font-size: ${scale(entryTitle.fontSizePt, "pt")};
  font-weight: ${entryTitle.fontWeight};
  color: ${entryTitle.color};
  letter-spacing: ${fmt(entryTitle.letterSpacingEm)}em;
  line-height: ${fmt(entryTitle.lineHeight)};
}

.cv article .entry-meta {
  margin: 0;
  flex-shrink: 0;
  font-family: ${fontStack(entryDate.fontFamily)};
  font-size: ${scale(entryDate.fontSizePt, "pt")};
  font-weight: ${entryDate.fontWeight};
  color: ${entryDate.color};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  letter-spacing: ${fmt(entryDate.letterSpacingEm)}em;
  line-height: ${fmt(entryDate.lineHeight)};
  font-style: ${fontStyle(entryDate)};
}

.cv article .entry-sub {
  margin: 0 0 ${scale(0.6, "mm")} 0;
  font-family: ${fontStack(entryMeta.fontFamily)};
  font-size: ${scale(entryMeta.fontSizePt, "pt")};
  color: ${entryMeta.color};
  line-height: ${fmt(entryMeta.lineHeight)};
  font-style: ${fontStyle(entryMeta)};
  page-break-after: avoid;
  break-after: avoid;
}

.cv article .entry-description,
.cv article p,
.cv article li {
  font-family: ${fontStack(entryBody.fontFamily)};
  font-size: ${scale(entryBody.fontSizePt, "pt")};
  color: ${entryBody.color};
  line-height: ${fmt(entryBody.lineHeight)};
}

.cv article .entry-description {
  margin: ${scale(1, "mm")} 0 0 0;
}

.cv .skills-grouped {
  list-style: disc;
  margin: 0;
  padding-left: ${scale(5, "mm")};
}

.cv .skills-grouped li {
  font-family: ${fontStack(listItem.fontFamily)};
  font-size: ${scale(listItem.fontSizePt, "pt")};
  margin: 0;
  line-height: ${fmt(listItem.lineHeight)};
  color: ${listItem.color};
}

.cv .skills-grouped li + li {
  margin-top: ${scale(0.6, "mm")};
}

.cv .skills-grouped .skill-category {
  font-weight: 700;
  color: ${def.colors.text};
}

.cv .skills-grouped .skill-name {
  color: ${def.colors.text};
}

.cv .skills-grouped .skill-level {
  font-family: ${fontStack(contact.fontFamily)};
  color: ${def.colors.muted};
  font-size: ${scale(Math.max(7.5, listItem.fontSizePt - 1.3), "pt")};
  margin-left: 0.2em;
  letter-spacing: 0.02em;
}

.cv .languages-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: ${scale(1.5, "mm")} ${scale(7, "mm")};
  font-family: ${fontStack(listItem.fontFamily)};
  font-size: ${scale(listItem.fontSizePt, "pt")};
  line-height: ${fmt(listItem.lineHeight)};
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
  color: ${def.colors.muted};
}

.cv .interests-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: ${scale(1.5, "mm")} ${scale(4, "mm")};
  font-family: ${fontStack(listItem.fontFamily)};
  font-size: ${scale(listItem.fontSizePt, "pt")};
  line-height: ${fmt(listItem.lineHeight)};
}

.cv .interests-list li {
  margin: 0;
}

${
  def.id === "classique"
    ? `.cv .interests-list li {\n  display: inline;\n}\n\n.cv .interests-list li + li::before {\n  content: " , ";\n  color: #b0aea5;\n}`
    : ""
}
${entryBulletCss}
${skillsBulletCss}
`;
  return css.replace(/#[0-9a-f]{6}/gi, (hex) => hex.toUpperCase());
}

function extractTemplateDefinition(
  root: FigmaNode,
  page: FigmaNode,
  fileKey: string,
): FigmaTemplateDefinition {
  const rootData = sharedData(root);
  const templateId = normalizeTemplateId(
    rootData.templateId || root.name?.replace(/^template:/, "") || page.name,
  );
  const nodes = flatten(root);
  const sourceNodeIds = groupNodeIdsByRole(nodes);

  for (const requiredRole of requiredCriticalRoles) {
    const count = sourceNodeIds[requiredRole]?.length ?? 0;
    if (count !== 1) {
      throw new Error(
        `${page.name ?? page.id}: expected exactly 1 role ${requiredRole}, got ${count}`,
      );
    }
  }

  const sections = requiredSectionIds.map((sectionId) => {
    const section = nodes.find(
      (node) =>
        sharedData(node).role === "section" &&
        sharedData(node).sectionId === sectionId,
    );
    if (!section?.id) {
      throw new Error(`${page.name ?? page.id}: missing required section ${sectionId}`);
    }
    const title = nodes.find(
      (node) =>
        sharedData(node).role === "section.title" &&
        sharedData(node).sectionId === sectionId,
    );
    return { id: sectionId, nodeId: section.id, titleNodeId: title?.id };
  });

  const text = (roleName: string) => {
    const node = singleNodeByRole(nodes, roleName, page.name ?? page.id ?? "page");
    if (node.type !== "TEXT") {
      throw new Error(`${node.id}: role ${roleName} must be a TEXT node`);
    }
    return node;
  };

  const optionalText = (roleName: string) =>
    nodes.find((node) => sharedData(node).role === roleName && node.type === "TEXT");

  const headline = text("text.headline");
  const name = text("text.name");
  const summary = text("text.summary");
  const sectionTitle = optionalText("section.title") ?? summary;
  const entryTitle = optionalText("entry.title") ?? sectionTitle;
  const entryDate = optionalText("entry.date") ?? headline;
  const entryMeta = optionalText("entry.meta") ?? summary;
  const entryBody = optionalText("entry.body") ?? optionalText("entry.bullet") ?? summary;
  const contact = optionalText("contact.email") ?? optionalText("contact.phone") ?? headline;
  const listItem =
    optionalText("skills.item") ??
    optionalText("languages.item") ??
    optionalText("languages.content") ??
    optionalText("interests.content") ??
    entryBody;
  const portfolioQrLabel = optionalText("portfolio.qrLabel") ?? contact;

  const templateDefaults = defaultsForTemplate(templateId);
  const ruleColor = firstRuleColor(nodes) ?? templateDefaults.rule;
  const photoNode = singleOptionalNodeByRole(nodes, "header.photo");
  const portfolioQrNode = singleOptionalNodeByRole(nodes, "portfolio.qrBox");
  const accentColor =
    templateDefaults.accent === templateDefaults.rule
      ? ruleColor
      : firstAccentColor(nodes) ?? templateDefaults.accent;
  const colors = {
    canvasBackground: templateDefaults.canvasBackground,
    pageBackground: firstSolidPaint(root.fills) ?? "#ffffff",
    text: paintColor(name) ?? templateDefaults.text,
    muted: paintColor(entryMeta) ?? templateDefaults.muted,
    accent: accentColor,
    rule: ruleColor,
    photoBackground:
      firstSolidPaint(photoNode?.fills) ?? templateDefaults.photoBackground,
    photoBorder:
      firstSolidPaint(photoNode?.strokes) ??
      templateDefaults.photoBorder ??
      accentColor,
    portfolioQrBackground:
      firstSolidPaint(portfolioQrNode?.fills) ??
      firstSolidPaint(photoNode?.fills) ??
      templateDefaults.photoBackground,
    portfolioQrBorder:
      firstSolidPaint(portfolioQrNode?.strokes) ??
      firstSolidPaint(photoNode?.strokes) ??
      templateDefaults.photoBorder ??
      accentColor,
  };

  const header = singleNodeByRole(nodes, "header", page.name ?? "page");
  const headerTop = singleOptionalNodeByRole(nodes, "header.top");
  const headerIdentity = singleOptionalNodeByRole(nodes, "header.identity");
  const sectionTitleWrap = firstNodeByRole(nodes, "section.titleWrap");
  const firstSection = nodes.find((node) => sharedData(node).role === "section");
  const firstEntry = nodes.find((node) => sharedData(node).role === "entry");
  const entryHeader = nodes.find((node) => sharedData(node).role === "entry.header");
  const entryBulletNode = optionalText("entry.bullet");
  const skillsBulletNode = optionalText("skills.item");
  const bullets = {
    entry: readBulletFromTextNode(entryBulletNode),
    skills: readBulletFromTextNode(skillsBulletNode),
  };
  const hasBullet = bullets.entry !== undefined || bullets.skills !== undefined;

  return validateTemplateDefinition({
    schemaVersion: 1,
    id: templateId,
    name: titleCase(templateId),
    source: {
      fileKey,
      pageId: requiredId(page, "page"),
      pageName: page.name ?? titleCase(templateId),
      rootNodeId: requiredId(root, "template"),
    },
    sourceNodeIds,
    page: {
      widthPx: nodeWidth(root, "template"),
      heightPx: nodeHeight(root, "template"),
    },
    colors,
    typography: {
      body: withDefaults(readTypography(summary, "body"), templateDefaults.body),
      name: readTypography(name, "name"),
      headline: readTypography(headline, "headline", "uppercase"),
      contact: readTypography(contact, "contact"),
      summary: readTypography(summary, "summary"),
      sectionTitle: readTypography(sectionTitle, "sectionTitle"),
      entryTitle: readTypography(entryTitle, "entryTitle"),
      entryDate: readTypography(entryDate, "entryDate"),
      entryMeta: readTypography(entryMeta, "entryMeta"),
      entryBody: readTypography(entryBody, "entryBody"),
      listItem: readTypography(listItem, "listItem"),
      portfolioQrLabel: readTypography(portfolioQrLabel, "portfolioQrLabel"),
    },
    layout: {
      pagePaddingMm: {
        top: pxToMm(root.paddingTop ?? 24),
        right: pxToMm(root.paddingRight ?? 24),
        bottom: pxToMm(root.paddingBottom ?? 24),
        left: pxToMm(root.paddingLeft ?? 24),
      },
      rootGapMm: pxToMm(root.itemSpacing ?? 18),
      headerGapMm: pxToMm(headerTop?.itemSpacing ?? templateDefaults.headerGapPx),
      headerPaddingBottomMm: pxToMm(header.paddingBottom ?? templateDefaults.headerPaddingBottomPx),
      headerMarginBottomMm: pxToMm(
        root.itemSpacing ?? templateDefaults.headerMarginBottomPx,
      ),
      headerBorderBottomWeightPt:
        typeof header.strokeWeight === "number"
          ? pxToPt(header.strokeWeight)
          : templateDefaults.headerBorderBottomWeightPt,
      headerIdentityBorderLeftWeightPt: (() => {
        const px = readStrokeWeightPxOnSide(headerIdentity, "left");
        return typeof px === "number"
          ? pxToPt(px)
          : templateDefaults.headerIdentityBorderLeftWeightPt;
      })(),
      headerIdentityBorderRadiiMm: (() => {
        const radii =
          readCornerRadiiMm(headerIdentity) ??
          uniformRadiiMm(templateDefaults.headerIdentityBorderRadiusMm);
        return clipRadiiToSide(radii, "left");
      })(),
      headerIdentityPaddingMm: headerIdentity
        ? readBoxPaddingMm(headerIdentity)
        : templateDefaults.headerIdentityPaddingMm,
      headerIdentityItemSpacingMm: pxToMm(
        headerIdentity?.itemSpacing ??
          templateDefaults.headerIdentityItemSpacingPx,
      ),
      headerSummaryGapMm: pxToMm(
        header.itemSpacing ?? templateDefaults.headerSummaryGapPx,
      ),
      photoSizeMm: {
        width: pxToMm(
          nodeWidth(photoNode, "header.photo", true) ??
            templateDefaults.photoSizePx,
        ),
        height: pxToMm(
          nodeHeight(photoNode, "header.photo", true) ??
            templateDefaults.photoSizePx,
        ),
      },
      photoStrokeWeightPt:
        typeof photoNode?.strokeWeight === "number"
          ? pxToPt(photoNode.strokeWeight)
          : templateDefaults.photoStrokeWeightPt,
      photoBorderRadiusMm:
        readCornerRadiusMm(photoNode) ?? templateDefaults.photoBorderRadiusMm,
      portfolioQrSizeMm: {
        width: pxToMm(
          nodeWidth(portfolioQrNode, "portfolio.qrBox", true) ??
            nodeWidth(photoNode, "header.photo", true) ??
            templateDefaults.photoSizePx,
        ),
        height: pxToMm(
          nodeHeight(portfolioQrNode, "portfolio.qrBox", true) ??
            nodeHeight(photoNode, "header.photo", true) ??
            templateDefaults.photoSizePx,
        ),
      },
      portfolioQrStrokeWeightPt:
        typeof portfolioQrNode?.strokeWeight === "number"
          ? pxToPt(portfolioQrNode.strokeWeight)
          : typeof photoNode?.strokeWeight === "number"
            ? pxToPt(photoNode.strokeWeight)
            : templateDefaults.photoStrokeWeightPt,
      portfolioQrRadiusMm:
        readCornerRadiusMm(portfolioQrNode) ??
        readCornerRadiusMm(photoNode) ??
        templateDefaults.photoBorderRadiusMm,
      // Sections are siblings in the template root auto-layout; gap between
      // them equals root.itemSpacing.
      sectionGapMm: pxToMm(root.itemSpacing ?? templateDefaults.sectionGapPx),
      // Classique inserts a `section.rule` sibling between sections; rule sits
      // with root.itemSpacing above and below. CSS renders the rule via
      // `border-bottom` so padding-bottom must equal root.itemSpacing to keep
      // the line in the same place as Figma. Other templates have no rule.
      sectionPaddingBottomMm:
        templateId === "classique"
          ? pxToMm(root.itemSpacing ?? templateDefaults.sectionPaddingBottomPx)
          : pxToMm(
              firstSection?.paddingBottom ??
                templateDefaults.sectionPaddingBottomPx,
            ),
      sectionTitleBorderWeightPt: (() => {
        const side = templateId === "moderne" ? "bottom" : "left";
        const px = readStrokeWeightPxOnSide(sectionTitleWrap, side);
        return typeof px === "number"
          ? pxToPt(px)
          : templateDefaults.sectionTitleBorderWeightPt;
      })(),
      sectionTitleBorderRadiiMm: (() => {
        const side = templateId === "moderne" ? "bottom" : "left";
        const radii =
          readCornerRadiiMm(sectionTitleWrap) ??
          uniformRadiiMm(templateDefaults.sectionTitleBorderRadiusMm);
        return clipRadiiToSide(radii, side);
      })(),
      // Within-section gap between title and content = section.itemSpacing.
      sectionTitleMarginBottomMm: pxToMm(
        firstSection?.itemSpacing ?? templateDefaults.sectionTitleMarginBottomPx,
      ),
      sectionTitlePaddingMm: sectionTitleWrap
        ? readBoxPaddingMm(sectionTitleWrap)
        : templateDefaults.sectionTitlePaddingMm,
      // Between-entry gap = section.itemSpacing (section auto-layout spaces
      // titleWrap and entries uniformly). firstEntry.itemSpacing is the gap
      // *within* an entry between entry.header and entry.body.
      entryGapMm: pxToMm(
        firstSection?.itemSpacing ??
          firstEntry?.itemSpacing ??
          templateDefaults.entryGapPx,
      ),
      entryHeaderGapMm: pxToMm(entryHeader?.itemSpacing ?? templateDefaults.entryHeaderGapPx),
    },
    bullets: hasBullet ? bullets : undefined,
    sections,
  });
}

function sharedData(node: FigmaNode): Record<string, string> {
  return (
    node.sharedPluginData?.[FIGMA_TEMPLATE_NAMESPACE] ??
    node.pluginData?.shared?.[FIGMA_TEMPLATE_NAMESPACE] ??
    {}
  );
}

function flatten(node: FigmaNode): FigmaNode[] {
  return [node, ...(node.children ?? []).flatMap(flatten)];
}

function groupNodeIdsByRole(nodes: FigmaNode[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const node of nodes) {
    const roleName = sharedData(node).role;
    if (!roleName || !node.id) continue;
    (result[roleName] ??= []).push(node.id);
  }
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function singleNodeByRole(
  nodes: FigmaNode[],
  roleName: string,
  context: string,
): FigmaNode {
  const matches = nodes.filter((node) => sharedData(node).role === roleName);
  if (matches.length !== 1) {
    throw new Error(
      `${context}: expected exactly 1 role ${roleName}, got ${matches.length}`,
    );
  }
  return matches[0]!;
}

function singleOptionalNodeByRole(
  nodes: FigmaNode[],
  roleName: string,
): FigmaNode | undefined {
  const matches = nodes.filter((node) => sharedData(node).role === roleName);
  if (matches.length > 1) {
    throw new Error(`expected at most 1 role ${roleName}, got ${matches.length}`);
  }
  return matches[0];
}

function firstNodeByRole(
  nodes: FigmaNode[],
  roleName: string,
): FigmaNode | undefined {
  return nodes.find((node) => sharedData(node).role === roleName);
}

function normalizeTemplateId(value: string | undefined): FigmaTemplateId {
  const normalized =
    value
      ?.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") ?? "";
  if (templateIds.includes(normalized as FigmaTemplateId)) {
    return normalized as FigmaTemplateId;
  }
  throw new Error(`Unsupported template id: ${value ?? "(missing)"}`);
}

function readTypography(
  node: FigmaNode,
  roleName: string,
  textTransform: "none" | "uppercase" = "none",
): FigmaTemplateDefinition["typography"]["body"] {
  const style = node.style;
  const fontFamily = style?.fontFamily;
  if (!fontFamily) throw new Error(`${node.id}: missing font for ${roleName}`);
  if (!supportedFontFamilies.includes(fontFamily as SupportedFontFamily)) {
    throw new Error(`${node.id}: unsupported font "${fontFamily}" for ${roleName}`);
  }
  const fontSizePx = requiredNumber(style.fontSize, `${node.id} fontSize`);
  const color = paintColor(node);
  if (!color) {
    throw new Error(`${node.id}: unsupported or missing solid text fill for ${roleName}`);
  }
  return {
    nodeId: requiredId(node, roleName),
    fontFamily: fontFamily as SupportedFontFamily,
    fontStyle: inferFontStyle(style.fontPostScriptName),
    fontWeight: style.fontWeight ?? 400,
    fontSizePt: pxToPt(fontSizePx),
    lineHeight: readLineHeight(style, fontSizePx),
    letterSpacingEm: readLetterSpacingEm(style, fontSizePx),
    color,
    textTransform,
    frameHeightMm: readFixedFrameHeightMm(node),
  };
}

type BulletDefinition = NonNullable<
  NonNullable<FigmaTemplateDefinition["bullets"]>["entry"]
>;

function readBulletFromTextNode(
  node: FigmaNode | undefined,
): BulletDefinition | undefined {
  if (!node || node.type !== "TEXT") return undefined;
  const chars = node.characters ?? "";
  const glyph = chars.length > 0 ? chars[0]! : "";
  if (!glyph || /\s/.test(glyph)) return undefined;
  const baseFontFamily = node.style?.fontFamily as SupportedFontFamily | undefined;
  if (!baseFontFamily) return undefined;
  const overrideKey = node.characterStyleOverrides?.[0];
  const override =
    typeof overrideKey === "number" && overrideKey > 0
      ? node.styleOverrideTable?.[String(overrideKey)]
      : undefined;
  const fontSizePx = override?.fontSize ?? node.style?.fontSize;
  if (typeof fontSizePx !== "number" || fontSizePx <= 0) return undefined;
  const fontFamily =
    (override?.fontFamily as SupportedFontFamily | undefined) ?? baseFontFamily;
  if (!supportedFontFamilies.includes(fontFamily as SupportedFontFamily)) {
    return undefined;
  }
  const color = paintColor(node);
  if (!color) return undefined;
  return {
    glyph,
    fontFamily: fontFamily as SupportedFontFamily,
    fontSizePt: pxToPt(fontSizePx),
    color,
  };
}

function readFixedFrameHeightMm(node: FigmaNode): number | undefined {
  const frameHeight = node.height ?? node.absoluteBoundingBox?.height;
  if (typeof frameHeight !== "number" || frameHeight <= 0) return undefined;
  const isSingleLine = !(node.characters ?? "").includes("\n");
  if (!isSingleLine) return undefined;
  const fixedVertical =
    node.layoutSizingVertical === "FIXED" ||
    (typeof node.textAutoResize === "string" &&
      node.textAutoResize !== "HEIGHT" &&
      node.textAutoResize !== "WIDTH_AND_HEIGHT");
  if (!fixedVertical) return undefined;
  return pxToMm(frameHeight);
}

function assertA4Size(definition: FigmaTemplateDefinition): void {
  const expectedWidthPx = (210 * 96) / 25.4;
  const expectedHeightPx = (297 * 96) / 25.4;
  const tolerancePx = 3;
  if (
    Math.abs(definition.page.widthPx - expectedWidthPx) > tolerancePx ||
    Math.abs(definition.page.heightPx - expectedHeightPx) > tolerancePx
  ) {
    throw new Error(
      `Template ${definition.id}: Figma frame must be A4-ish, got ${definition.page.widthPx}x${definition.page.heightPx}px`,
    );
  }
}

function withDefaults<T extends FigmaTemplateDefinition["typography"]["body"]>(
  value: T,
  defaults: Partial<T>,
): T {
  return { ...value, ...defaults };
}

function readLineHeight(
  style: NonNullable<FigmaNode["style"]>,
  fontSizePx: number,
): number {
  const lineHeightPx =
    typeof style.lineHeightPx === "number" && style.lineHeightPx > 0
      ? style.lineHeightPx
      : typeof style.lineHeightPercent === "number" && style.lineHeightPercent > 0
        ? (style.lineHeightPercent / 100) * fontSizePx
        : 1.2 * fontSizePx;
  return round(lineHeightPx / fontSizePx, 4);
}

function readLetterSpacingEm(
  style: NonNullable<FigmaNode["style"]>,
  fontSizePx: number,
): number {
  if (typeof style.letterSpacingPercent === "number") {
    return round(style.letterSpacingPercent / 100, 4);
  }
  if (typeof style.letterSpacing === "number") {
    return round(style.letterSpacing / fontSizePx, 4);
  }
  return 0;
}

function paintColor(node: FigmaNode): string | null {
  return firstSolidPaint(node.fills);
}

function firstAccentColor(nodes: FigmaNode[]): string | null {
  const accentRoles = ["header.identity", "header.photo", "section.titleWrap"];
  for (const role of accentRoles) {
    const node = nodes.find((candidate) => sharedData(candidate).role === role);
    const color = firstSolidPaint(node?.strokes);
    if (color) return color;
  }
  for (const role of ["header.identity", "section.titleWrap"]) {
    const node = nodes.find((candidate) => sharedData(candidate).role === role);
    const color = firstSolidPaint(node?.fills);
    if (color) return color;
  }
  return null;
}

function firstRuleColor(nodes: FigmaNode[]): string | null {
  const rule = nodes.find(
    (node) =>
      sharedData(node).role === "section.rule" ||
      (node.type === "RECTANGLE" && (nodeHeight(node, "rectangle", true) ?? 99) <= 2),
  );
  return firstSolidPaint(rule?.fills) ?? firstSolidPaint(rule?.strokes);
}

function firstSolidPaint(paints: unknown): string | null {
  if (!Array.isArray(paints)) return null;
  const paint = paints.find(
    (p: FigmaPaint) => p?.type === "SOLID" && p.visible !== false && p.color,
  ) as FigmaPaint | undefined;
  if (!paint?.color) return null;
  return rgbToHex(paint.color);
}

function rgbToHex(color: { r: number; g: number; b: number }): string {
  return `#${[color.r, color.g, color.b]
    .map((channel) =>
      Math.round(Math.max(0, Math.min(1, channel)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function requiredId(node: FigmaNode, label: string): string {
  if (!node.id) throw new Error(`${label}: missing node id`);
  return node.id;
}

function requiredNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label}: expected finite number`);
  }
  return value;
}

function nodeWidth(
  node: FigmaNode | undefined,
  label: string,
  optional?: false,
): number;
function nodeWidth(
  node: FigmaNode | undefined,
  label: string,
  optional: true,
): number | undefined;
function nodeWidth(
  node: FigmaNode | undefined,
  label: string,
  optional = false,
): number | undefined {
  return nodeDimension(node, label, "width", optional);
}

function nodeHeight(
  node: FigmaNode | undefined,
  label: string,
  optional?: false,
): number;
function nodeHeight(
  node: FigmaNode | undefined,
  label: string,
  optional: true,
): number | undefined;
function nodeHeight(
  node: FigmaNode | undefined,
  label: string,
  optional = false,
): number | undefined {
  return nodeDimension(node, label, "height", optional);
}

function nodeDimension(
  node: FigmaNode | undefined,
  label: string,
  key: "width" | "height",
  optional: boolean,
): number | undefined {
  const value = node?.[key] ?? node?.absoluteBoundingBox?.[key];
  if (optional && value === undefined) return undefined;
  return requiredNumber(value, `${label} ${key}`);
}

function readCornerRadiusMm(node: FigmaNode | undefined): number | undefined {
  if (!node) return undefined;
  if (typeof node.cornerRadius === "number") return pxToMm(node.cornerRadius);
  const corners = node.rectangleCornerRadii;
  if (Array.isArray(corners) && corners.length > 0) {
    const max = Math.max(...corners.map((value) => (Number.isFinite(value) ? value : 0)));
    return pxToMm(max);
  }
  return undefined;
}

type CornerRadiiPx = {
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
};

function readCornerRadiiPx(node: FigmaNode | undefined): CornerRadiiPx | undefined {
  if (!node) return undefined;
  const tl = node.topLeftRadius;
  const tr = node.topRightRadius;
  const bl = node.bottomLeftRadius;
  const br = node.bottomRightRadius;
  if (
    typeof tl === "number" ||
    typeof tr === "number" ||
    typeof bl === "number" ||
    typeof br === "number"
  ) {
    return {
      topLeft: typeof tl === "number" ? tl : 0,
      topRight: typeof tr === "number" ? tr : 0,
      bottomLeft: typeof bl === "number" ? bl : 0,
      bottomRight: typeof br === "number" ? br : 0,
    };
  }
  const arr = node.rectangleCornerRadii;
  if (Array.isArray(arr) && arr.length === 4) {
    const [topLeft, topRight, bottomRight, bottomLeft] = arr.map((v) =>
      Number.isFinite(v) ? v : 0,
    );
    return {
      topLeft: topLeft ?? 0,
      topRight: topRight ?? 0,
      bottomRight: bottomRight ?? 0,
      bottomLeft: bottomLeft ?? 0,
    };
  }
  if (typeof node.cornerRadius === "number") {
    const v = node.cornerRadius;
    return { topLeft: v, topRight: v, bottomLeft: v, bottomRight: v };
  }
  return undefined;
}

function readCornerRadiiMm(
  node: FigmaNode | undefined,
): { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number } | undefined {
  const px = readCornerRadiiPx(node);
  if (!px) return undefined;
  return {
    topLeft: pxToMm(px.topLeft),
    topRight: pxToMm(px.topRight),
    bottomLeft: pxToMm(px.bottomLeft),
    bottomRight: pxToMm(px.bottomRight),
  };
}

function readBoxPaddingMm(node: FigmaNode | undefined) {
  return {
    top: pxToMm(node?.paddingTop ?? 0),
    right: pxToMm(node?.paddingRight ?? 0),
    bottom: pxToMm(node?.paddingBottom ?? 0),
    left: pxToMm(node?.paddingLeft ?? 0),
  };
}

function uniformRadiiMm(value: number) {
  return { topLeft: value, topRight: value, bottomLeft: value, bottomRight: value };
}

function clipRadiiToSide(
  radii: { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number },
  side: "top" | "right" | "bottom" | "left",
): { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number } {
  switch (side) {
    case "left":
      return { topLeft: radii.topLeft, topRight: 0, bottomLeft: radii.bottomLeft, bottomRight: 0 };
    case "right":
      return { topLeft: 0, topRight: radii.topRight, bottomLeft: 0, bottomRight: radii.bottomRight };
    case "top":
      return { topLeft: radii.topLeft, topRight: radii.topRight, bottomLeft: 0, bottomRight: 0 };
    case "bottom":
      return { topLeft: 0, topRight: 0, bottomLeft: radii.bottomLeft, bottomRight: radii.bottomRight };
  }
}

function readStrokeWeightPxOnSide(
  node: FigmaNode | undefined,
  side: "top" | "right" | "bottom" | "left",
): number | undefined {
  if (!node) return undefined;
  const flatKey = (
    {
      top: "strokeTopWeight",
      right: "strokeRightWeight",
      bottom: "strokeBottomWeight",
      left: "strokeLeftWeight",
    } as const
  )[side];
  const flatWeight = node[flatKey];
  if (typeof flatWeight === "number" && flatWeight > 0) return flatWeight;
  const restWeight = node.individualStrokeWeights?.[side];
  if (typeof restWeight === "number" && restWeight > 0) return restWeight;
  if (typeof node.strokeWeight === "number" && node.strokeWeight > 0) {
    return node.strokeWeight;
  }
  return undefined;
}

function pxToMm(px: number): number {
  return round((px * 25.4) / 96, 4);
}

function pxToPt(px: number): number {
  return round(px * 0.75, 4);
}

function round(value: number, places = 3): number {
  return Number(value.toFixed(places));
}

function fmt(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function scale(value: number, unit: "pt" | "mm" | "px"): string {
  return `\${s(${fmt(value)}, "${unit}")}`;
}

function frameHeightDecl(
  token: FigmaTemplateDefinition["typography"]["body"],
): string {
  if (typeof token.frameHeightMm !== "number") return "";
  return `\n  height: ${scale(token.frameHeightMm, "mm")};\n  overflow: visible;`;
}

function bulletMarkerCss(
  selector: string,
  bullet: BulletDefinition | undefined,
): string {
  if (!bullet) return "";
  // Most bullet glyphs in Figma are full-color circles/squares the user picked
  // for visual weight. Render them via ::marker so the size escalates beyond
  // the browser-default disc while preserving native list semantics.
  return `${selector}::marker {\n  content: "${escapeCssContent(bullet.glyph)}  ";\n  font-family: ${fontStack(bullet.fontFamily)};\n  font-size: ${scale(bullet.fontSizePt, "pt")};\n  color: ${bullet.color};\n}`;
}

function escapeCssContent(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function fontStack(fontFamily: SupportedFontFamily): string {
  return fallbackStacks[fontFamily];
}

function fontStyle(token: FigmaTemplateDefinition["typography"]["body"]): string {
  return token.fontStyle.toLowerCase().includes("italic") ? "italic" : "normal";
}

function inferFontStyle(postScriptName: string | undefined): string {
  if (!postScriptName) return "Regular";
  const suffix = postScriptName.split("-").pop();
  return suffix || "Regular";
}

function shadowColor(hex: string, alpha: number): string {
  const parsed = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!parsed) return `rgba(17, 17, 17, ${alpha})`;
  const [, r, g, b] = parsed;
  return `rgba(${Number.parseInt(r!, 16)}, ${Number.parseInt(g!, 16)}, ${Number.parseInt(b!, 16)}, ${alpha})`;
}

function titleCase(id: FigmaTemplateId): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function defaultsForTemplate(id: FigmaTemplateId): {
  canvasBackground: string;
  text: string;
  muted: string;
  accent: string;
  rule: string;
  photoBackground: string;
  photoBorder?: string;
  headerGapPx: number;
  headerPaddingBottomPx: number;
  headerMarginBottomPx: number;
  headerBorderBottomWeightPt: number;
  headerIdentityBorderLeftWeightPt: number;
  headerIdentityBorderRadiusMm: number;
  headerIdentityPaddingMm: { top: number; right: number; bottom: number; left: number };
  headerIdentityItemSpacingPx: number;
  headerSummaryGapPx: number;
  photoSizePx: number;
  photoStrokeWeightPt: number;
  photoBorderRadiusMm: number;
  sectionGapPx: number;
  sectionPaddingBottomPx: number;
  sectionTitleBorderWeightPt: number;
  sectionTitleBorderRadiusMm: number;
  sectionTitleMarginBottomPx: number;
  sectionTitlePaddingMm: { top: number; right: number; bottom: number; left: number };
  entryGapPx: number;
  entryHeaderGapPx: number;
  body: Partial<FigmaTemplateDefinition["typography"]["body"]>;
} {
  switch (id) {
    case "classique":
      return {
        canvasBackground: "#e6e4d8",
        text: "#141413",
        muted: "#5e5d59",
        accent: "#1b365d",
        rule: "#d4d2cc",
        photoBackground: "#e8e6dc",
        headerGapPx: 26.4567,
        headerPaddingBottomPx: 13.2283,
        headerMarginBottomPx: 18.8976,
        headerBorderBottomWeightPt: 0.5,
        headerIdentityBorderLeftWeightPt: 2.5,
        headerIdentityBorderRadiusMm: 0.5292,
        headerIdentityPaddingMm: { top: 0, right: 0, bottom: 0, left: 4 },
        headerIdentityItemSpacingPx: 4.5354,
        headerSummaryGapPx: 15.1181,
        photoSizePx: 105.8268,
        photoStrokeWeightPt: 0.75,
        photoBorderRadiusMm: 1.5,
        sectionGapPx: 9.4488,
        sectionPaddingBottomPx: 18.8976,
        sectionTitleBorderWeightPt: 2.5,
        sectionTitleBorderRadiusMm: 0.5292,
        sectionTitleMarginBottomPx: 9.4488,
        sectionTitlePaddingMm: { top: 0.4, right: 0, bottom: 0.4, left: 3 },
        entryGapPx: 9.4488,
        entryHeaderGapPx: 15.1181,
        body: { fontFamily: "Newsreader", fontSizePt: 10, lineHeight: 1.5 },
      };
    case "moderne":
      return {
        canvasBackground: "#e9e6e0",
        text: "#111111",
        muted: "#3a3a3a",
        accent: "#a8421e",
        rule: "#a8421e",
        photoBackground: "#f3f0ea",
        photoBorder: "#262626",
        headerGapPx: 30.2362,
        headerPaddingBottomPx: 11.3386,
        headerMarginBottomPx: 22.6772,
        headerBorderBottomWeightPt: 0.75,
        headerIdentityBorderLeftWeightPt: 0,
        headerIdentityBorderRadiusMm: 0,
        headerIdentityPaddingMm: { top: 0, right: 0, bottom: 0, left: 0 },
        headerIdentityItemSpacingPx: 8.3149,
        headerSummaryGapPx: 15.1181,
        photoSizePx: 98.2677,
        photoStrokeWeightPt: 0.5,
        photoBorderRadiusMm: 0,
        sectionGapPx: 9.4488,
        sectionPaddingBottomPx: 0,
        sectionTitleBorderWeightPt: 0.75,
        sectionTitleBorderRadiusMm: 0,
        sectionTitleMarginBottomPx: 9.4488,
        sectionTitlePaddingMm: { top: 0, right: 0, bottom: 0, left: 0 },
        entryGapPx: 9.4488,
        entryHeaderGapPx: 15.1181,
        body: { fontFamily: "IBM Plex Sans", fontSizePt: 10.5, lineHeight: 1.5 },
      };
    case "minimaliste":
      return {
        canvasBackground: "#ececec",
        text: "#111111",
        muted: "#555555",
        accent: "#111111",
        rule: "#111111",
        photoBackground: "#ffffff",
        headerGapPx: 22.6772,
        headerPaddingBottomPx: 11.3386,
        headerMarginBottomPx: 22.6772,
        headerBorderBottomWeightPt: 0.5,
        headerIdentityBorderLeftWeightPt: 0,
        headerIdentityBorderRadiusMm: 0,
        headerIdentityPaddingMm: { top: 0, right: 0, bottom: 0, left: 0 },
        headerIdentityItemSpacingPx: 5.6693,
        headerSummaryGapPx: 15.1181,
        photoSizePx: 83.1496,
        photoStrokeWeightPt: 0.75,
        photoBorderRadiusMm: 1.5,
        sectionGapPx: 9.4488,
        sectionPaddingBottomPx: 0,
        sectionTitleBorderWeightPt: 1.5,
        sectionTitleBorderRadiusMm: 0,
        sectionTitleMarginBottomPx: 9.4488,
        sectionTitlePaddingMm: { top: 0.5, right: 0, bottom: 0.5, left: 4 },
        entryGapPx: 9.4488,
        entryHeaderGapPx: 15.1181,
        body: { fontFamily: "Inter", fontSizePt: 10.5, lineHeight: 1.45 },
      };
  }
}
