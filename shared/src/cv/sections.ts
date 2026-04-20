export type CvSectionKey =
  | "formations"
  | "experiences"
  | "skills"
  | "languages"
  | "interests";

export type CvSectionDef = {
  key: CvSectionKey;
  label: string;
  order: number;
};

export const cvSections: readonly CvSectionDef[] = [
  { key: "formations", label: "Formations", order: 1 },
  { key: "experiences", label: "Expériences Professionnelles", order: 2 },
  { key: "skills", label: "Compétences", order: 3 },
  { key: "languages", label: "Langues", order: 4 },
  { key: "interests", label: "Centres d'Intérêt", order: 5 },
] as const;
