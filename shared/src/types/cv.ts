import type { z } from "zod";
import type {
  appearanceSchema,
  cvDataSchema,
  experienceSchema,
  fontFamilySchema,
  formationSchema,
  interestSchema,
  languageSchema,
  localeSchema,
  paletteSchema,
  personalInfoSchema,
  skillSchema,
} from "../schemas/cv";

export type PersonalInfo = z.infer<typeof personalInfoSchema>;
export type Formation = z.infer<typeof formationSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Language = z.infer<typeof languageSchema>;
export type Interest = z.infer<typeof interestSchema>;
export type CvData = z.infer<typeof cvDataSchema>;
export type Palette = z.infer<typeof paletteSchema>;
export type LocaleCode = z.infer<typeof localeSchema>;
export type Appearance = z.infer<typeof appearanceSchema>;
export type FontFamily = z.infer<typeof fontFamilySchema>;
