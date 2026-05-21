import type { MasterCvData } from "../schemas/masterCv";

export function createEmptyMaster(
  firstName = "",
  lastName = "",
): MasterCvData {
  return {
    personalInfo: { firstName, lastName, portfolioDisplay: "clickable" },
    summaries: [],
    experiences: [],
    formations: [],
    skills: [],
    languages: [],
    interests: [],
    projects: [],
    certifications: [],
  };
}
