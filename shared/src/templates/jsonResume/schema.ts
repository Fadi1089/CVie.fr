import { z } from "zod";

const MAX_SHORT = 200;
const MAX_MEDIUM = 500;
const MAX_LONG = 2_000;
const MAX_URL = 2_000;
const MAX_ARRAY = 50;

const httpUrl = z
  .url()
  .max(MAX_URL)
  .refine(
    (u) => {
      try {
        const p = new URL(u).protocol;
        return p === "http:" || p === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL must be http(s)" },
  );

const optionalHttpUrl = z.union([z.literal(""), httpUrl]).optional();

const isoMonth = z
  .string()
  .regex(/^\d{4}(-\d{2})?(-\d{2})?$/, "ISO date required")
  .optional();

const profileSchema = z.object({
  network: z.string().max(MAX_SHORT),
  username: z.string().max(MAX_SHORT).optional(),
  url: optionalHttpUrl,
});

const locationSchema = z.object({
  address: z.string().max(MAX_MEDIUM).optional(),
  postalCode: z.string().max(MAX_SHORT).optional(),
  city: z.string().max(MAX_SHORT).optional(),
  countryCode: z.string().max(2).optional(),
  region: z.string().max(MAX_SHORT).optional(),
});

/** CVie-specific basics extensions. Lives under `basics.x_cvie` so themes
 *  that don't know about it ignore the field harmlessly. */
const cvieBasicsExtSchema = z.object({
  portfolioDisplay: z.enum(["cleartext", "qr", "clickable"]).optional(),
  locale: z.enum(["fr", "en", "de", "es", "nl"]).optional(),
});

const basicsSchema = z.object({
  name: z.string().min(1).max(MAX_SHORT),
  label: z.string().max(MAX_MEDIUM).optional(),
  image: z.string().max(100_000).optional(),
  email: z.union([z.literal(""), z.email().max(MAX_SHORT)]).optional(),
  phone: z.string().max(MAX_SHORT).optional(),
  url: optionalHttpUrl,
  summary: z.string().max(MAX_LONG).optional(),
  location: locationSchema.optional(),
  profiles: z.array(profileSchema).max(MAX_ARRAY).default([]),
  x_cvie: cvieBasicsExtSchema.optional(),
});

const workSchema = z.object({
  name: z.string().max(MAX_MEDIUM),
  position: z.string().max(MAX_MEDIUM),
  url: optionalHttpUrl,
  startDate: isoMonth,
  endDate: isoMonth,
  summary: z.string().max(MAX_LONG).optional(),
  highlights: z.array(z.string().max(MAX_LONG)).max(15).default([]),
  location: z.string().max(MAX_SHORT).optional(),
});

const educationSchema = z.object({
  institution: z.string().max(MAX_MEDIUM),
  area: z.string().max(MAX_MEDIUM).optional(),
  studyType: z.string().max(MAX_MEDIUM).optional(),
  startDate: isoMonth,
  endDate: isoMonth,
  score: z.string().max(MAX_SHORT).optional(),
  url: optionalHttpUrl,
  location: z.string().max(MAX_SHORT).optional(),
  summary: z.string().max(MAX_LONG).optional(),
});

const skillSchema = z.object({
  name: z.string().max(MAX_MEDIUM),
  level: z.string().max(MAX_SHORT).optional(),
  keywords: z.array(z.string().max(MAX_SHORT)).max(MAX_ARRAY).default([]),
});

const languageSchema = z.object({
  language: z.string().max(MAX_SHORT),
  fluency: z.string().max(MAX_SHORT).optional(),
});

const interestSchema = z.object({
  name: z.string().max(MAX_SHORT),
  keywords: z.array(z.string().max(MAX_SHORT)).max(MAX_ARRAY).default([]),
});

export const jsonResumeSchema = z.object({
  basics: basicsSchema,
  work: z.array(workSchema).max(MAX_ARRAY).default([]),
  education: z.array(educationSchema).max(MAX_ARRAY).default([]),
  skills: z.array(skillSchema).max(MAX_ARRAY).default([]),
  languages: z.array(languageSchema).max(MAX_ARRAY).default([]),
  interests: z.array(interestSchema).max(MAX_ARRAY).default([]),
});

export type JsonResume = z.infer<typeof jsonResumeSchema>;
