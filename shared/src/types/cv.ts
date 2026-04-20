import type { z } from "zod";
import type {
  cvDataSchema,
  experienceSchema,
  formationSchema,
  interestSchema,
  languageSchema,
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
