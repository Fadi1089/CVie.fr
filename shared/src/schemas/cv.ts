import { z } from "zod";

/**
 * URL whose scheme is restricted to http(s) — rejects `javascript:`, `data:`,
 * `file:`, `ftp:`, etc. Any string that reaches `<a href>` must go through
 * this so an attacker can't embed `javascript:alert(1)` in a CV.
 */
const httpUrlSchema = z
  .url()
  .refine(
    (u) => {
      try {
        const proto = new URL(u).protocol;
        return proto === "http:" || proto === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL must use http:// or https://" },
  );

/**
 * Image URL — allows http(s) plus `data:image/*` (we use a data-URI SVG as
 * the default photo placeholder). Rejects everything else.
 */
const imageUrlSchema = z
  .url()
  .refine(
    (u) => {
      try {
        const parsed = new URL(u);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          return true;
        }
        return parsed.protocol === "data:" && u.startsWith("data:image/");
      } catch {
        return false;
      }
    },
    { message: "Image URL must use http(s):// or data:image/..." },
  );

// Reasonable upper bounds — generous for real use, tight enough to prevent
// resource-exhaustion DoS via oversized payloads through the PDF pipeline.
const MAX_SHORT = 200;
const MAX_MEDIUM = 500;
const MAX_LONG = 2_000;
const MAX_URL = 2_000;
const MAX_ID = 64;
const MAX_ARRAY = 50;
const MAX_BULLETS = 15;

// Optional text fields in the editor bind to uncontrolled inputs whose empty
// value is `""`, not `undefined`. `z.email()` / `z.url()` reject `""`, which
// would make the preview fail validation the moment a user touched and then
// cleared an optional field. Treat `""` as "not filled" for these fields.
const optionalEmail = z
  .union([z.literal(""), z.email().max(MAX_SHORT)])
  .optional();
const optionalHttpUrl = z
  .union([z.literal(""), httpUrlSchema.max(MAX_URL)])
  .optional();
const optionalImageUrl = z
  .union([z.literal(""), imageUrlSchema.max(100_000)])
  .optional();

export const personalInfoSchema = z.object({
  firstName: z.string().min(1).max(MAX_SHORT),
  lastName: z.string().min(1).max(MAX_SHORT),
  email: optionalEmail,
  phone: z.string().max(MAX_SHORT).optional(),
  city: z.string().max(MAX_SHORT).optional(),
  jobTitle: z.string().max(MAX_MEDIUM).optional(),
  summary: z.string().max(MAX_LONG).optional(),
  linkedinUrl: optionalHttpUrl,
  portfolioUrl: optionalHttpUrl,
  portfolioDisplay: z
    .enum(["cleartext", "qr", "clickable"])
    .optional()
    .default("clickable"),
  /**
   * Optional profile photo URL. Photos are legally optional in France
   * (loi du 27 mai 2008 — anti-discrimination). Rendered as <img> so the
   * PDF generator preserves it (background-image often gets dropped).
   */
  photoUrl: optionalImageUrl,
});

/**
 * A CV date is either "YYYY-MM", "present" (ongoing — only meaningful as
 * an end-date), or empty (= never filled). The `"present"` sentinel
 * disambiguates a deliberate "en cours" pick from a freshly-added card.
 */
const cvDateSchema = z
  .string()
  .max(MAX_ID)
  .refine((v) => v === "" || v === "present" || /^\d{4}-\d{2}$/.test(v), {
    message: "Format de date invalide (YYYY-MM ou 'present')",
  });

/** Rejects end < start when both are real YYYY-MM strings. */
const isEndAfterStart = (v: { startDate: string; endDate?: string }) =>
  !v.endDate ||
  v.endDate === "present" ||
  !/^\d{4}-\d{2}$/.test(v.startDate) ||
  !/^\d{4}-\d{2}$/.test(v.endDate) ||
  v.endDate >= v.startDate;

export const formationSchema = z
  .object({
    id: z.string().min(1).max(MAX_ID),
    degree: z.string().max(MAX_MEDIUM),
    school: z.string().max(MAX_MEDIUM),
    city: z.string().max(MAX_SHORT).optional(),
    startDate: cvDateSchema,
    endDate: cvDateSchema.optional(),
    description: z.string().max(MAX_LONG).optional(),
  })
  .refine(isEndAfterStart, {
    message: "La date de début doit précéder la date de fin",
    path: ["endDate"],
  });

export const experienceSchema = z
  .object({
    id: z.string().min(1).max(MAX_ID),
    jobTitle: z.string().max(MAX_MEDIUM),
    company: z.string().max(MAX_MEDIUM),
    city: z.string().max(MAX_SHORT).optional(),
    startDate: cvDateSchema,
    endDate: cvDateSchema.optional(),
    bullets: z.array(z.string().max(MAX_LONG)).max(MAX_BULLETS).default([]),
    // Free-form description. Lines prefixed with `- ` or `• ` render as
    // bullets in the output; other non-empty lines render as paragraph text.
    description: z.string().max(MAX_LONG).optional(),
  })
  .refine(isEndAfterStart, {
    message: "La date de début doit précéder la date de fin",
    path: ["endDate"],
  });

export const skillSchema = z.object({
  id: z.string().min(1).max(MAX_ID),
  name: z.string().max(MAX_MEDIUM),
  level: z.enum(["débutant", "intermédiaire", "avancé", "expert"]).optional(),
  category: z.string().max(MAX_SHORT).optional(),
});

export const languageSchema = z.object({
  id: z.string().min(1).max(MAX_ID),
  name: z.string().max(MAX_SHORT),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "natif"]),
});

export const interestSchema = z.object({
  id: z.string().min(1).max(MAX_ID),
  name: z.string().max(MAX_SHORT),
});

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/i, { message: "Format couleur invalide (#RRGGBB)" });

export const paletteSchema = z.object({
  accent: hexColorSchema,
  link:   hexColorSchema,
  ink:    hexColorSchema,
  soft:   hexColorSchema,
  rule:   hexColorSchema,
  canvas: hexColorSchema,
});

export const SUPPORTED_LOCALES = ["fr", "en", "de", "es", "nl"] as const;
export const localeSchema = z.enum(SUPPORTED_LOCALES);

/** Per-role font-size delta in pt. Name/label ranges are wider — headline carries more visual weight. */
const textSizesSchema = z
  .object({
    name:    z.number().min(-5).max(8).optional(),
    label:   z.number().min(-4).max(6).optional(),
    section: z.number().min(-3).max(5).optional(),
    title:   z.number().min(-3).max(5).optional(),
    card:    z.number().min(-3).max(5).optional(),
    body:    z.number().min(-2).max(4).optional(),
    meta:    z.number().min(-2).max(4).optional(),
    fine:    z.number().min(-2).max(4).optional(),
  })
  .optional();

/** Header media (photo + QR) size delta in mm. */
const mediaSizeSchema = z.number().min(-8).max(12).optional();

/**
 * Layout spacing deltas from Figma-synced template baselines (units noted per field).
 * A value of `0` or `undefined` means "use baseline". Negative values tighten,
 * positive values loosen.
 *   pageMargin  — mm, outer content padding
 *   sectionGap  — mm, gap between major content blocks
 *   itemGap     — mm, gap between entries inside a section
 *   lineHeight  — unitless, additive to baseline line-height
 */
const spacingSchema = z
  .object({
    pageMargin: z.number().min(-6).max(8).optional(),
    sectionGap: z.number().min(-3).max(8).optional(),
    itemGap: z.number().min(-2).max(6).optional(),
    lineHeight: z.number().min(-0.2).max(0.4).optional(),
  })
  .optional();

export const appearanceSchema = z.object({
  palette: paletteSchema.optional(),
  locale: localeSchema.optional(),
  textSizes: textSizesSchema,
  mediaSize: mediaSizeSchema,
  spacing: spacingSchema,
});

export const cvDataSchema = z.object({
  personalInfo: personalInfoSchema,
  formations: z.array(formationSchema).max(MAX_ARRAY).default([]),
  experiences: z.array(experienceSchema).max(MAX_ARRAY).default([]),
  skills: z.array(skillSchema).max(MAX_ARRAY).default([]),
  languages: z.array(languageSchema).max(MAX_ARRAY).default([]),
  interests: z.array(interestSchema).max(MAX_ARRAY).default([]),
  appearance: appearanceSchema.optional(),
  // New in the JSON Resume era. `themeId` picks the curated theme; runtime
  // validity is enforced server-side against the registry, not here, so the
  // schema can stay decoupled from the theme catalogue.
  themeId: z.string().min(1).max(MAX_ID).default("community-stackoverflow"),
  // Theme-defined customization knobs. Each theme owns its own Zod schema
  // (see `theme.meta.customizationSchema`); we keep this loose here because
  // the same `cvDataSchema` is reused across themes and the active theme is
  // only known after this point.
  customization: z.record(z.string(), z.unknown()).default({}),
});
