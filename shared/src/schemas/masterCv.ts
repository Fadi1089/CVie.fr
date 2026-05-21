import { z } from "zod";
import {
  personalInfoSchema,
  experienceSchema,
  formationSchema,
  skillSchema,
  languageSchema,
  interestSchema,
} from "./cv";

const MAX_SHORT = 200;
const MAX_MEDIUM = 500;
const MAX_LONG = 2_000;
const MAX_ID = 64;

const cvDate = z
  .string()
  .max(MAX_ID)
  .refine((v) => v === "" || v === "present" || /^\d{4}-\d{2}$/.test(v));

const optionalHttpUrl = z.union([z.literal(""), z.url().max(2000)]).optional();

const TAGS = z.array(z.string().min(1).max(40)).max(20).default([]);

export const masterSummarySchema = z.object({
  id: z.string().min(1).max(MAX_ID),
  label: z.string().min(1).max(64),
  text: z.string().max(MAX_LONG),
});

export const masterExperienceSchema = experienceSchema.extend({
  achievements: z.array(z.string().max(MAX_LONG)).max(30).default([]),
  tags: TAGS,
});

export const masterFormationSchema = formationSchema.extend({ tags: TAGS });
export const masterSkillSchema = skillSchema.extend({ tags: TAGS });

export const projectSchema = z.object({
  id: z.string().min(1).max(MAX_ID),
  name: z.string().min(1).max(MAX_MEDIUM),
  role: z.string().max(MAX_MEDIUM).optional(),
  startDate: cvDate.optional(),
  endDate: cvDate.optional(),
  url: optionalHttpUrl,
  description: z.string().max(MAX_LONG).optional(),
  tags: TAGS,
});

export const certificationSchema = z.object({
  id: z.string().min(1).max(MAX_ID),
  name: z.string().min(1).max(MAX_MEDIUM),
  issuer: z.string().max(MAX_MEDIUM),
  date: cvDate.optional(),
  url: optionalHttpUrl,
  tags: TAGS,
});

export const masterCvDataSchema = z.object({
  personalInfo: personalInfoSchema,
  summaries: z.array(masterSummarySchema).max(10).default([]),
  experiences: z.array(masterExperienceSchema).max(50).default([]),
  formations: z.array(masterFormationSchema).max(30).default([]),
  skills: z.array(masterSkillSchema).max(120).default([]),
  languages: z.array(languageSchema).max(20).default([]),
  interests: z.array(interestSchema).max(40).default([]),
  projects: z.array(projectSchema).max(40).default([]),
  certifications: z.array(certificationSchema).max(30).default([]),
  notes: z.string().max(8000).optional(),
});

export type MasterCvData = z.infer<typeof masterCvDataSchema>;
export type MasterExperience = z.infer<typeof masterExperienceSchema>;
export type MasterFormation = z.infer<typeof masterFormationSchema>;
export type MasterSkill = z.infer<typeof masterSkillSchema>;
export type MasterSummary = z.infer<typeof masterSummarySchema>;
export type ProjectEntry = z.infer<typeof projectSchema>;
export type CertificationEntry = z.infer<typeof certificationSchema>;
