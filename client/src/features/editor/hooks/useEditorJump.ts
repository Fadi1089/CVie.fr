import { createContext, useContext } from "react";
import type { CvData } from "@cvie/shared";

export type JumpFn = (path: string) => void;

export const EditorJumpContext = createContext<JumpFn | null>(null);

export function useEditorJump(): JumpFn | null {
  return useContext(EditorJumpContext);
}

export type ResolvedJump = { sectionId: string; itemId: string };

const personalAlias: Record<string, string> = {
  firstName: "personalInfo.name",
  lastName: "personalInfo.name",
  portfolioDisplay: "personalInfo.portfolioUrl",
};

export function resolvePathToJump(path: string, cv: CvData): ResolvedJump | null {
  if (path.startsWith("personalInfo.")) {
    const field = path.slice("personalInfo.".length);
    const itemId = personalAlias[field] ?? `personalInfo.${field}`;
    return { sectionId: "personalInfo", itemId };
  }
  const m = path.match(/^(experiences|formations|skills|languages|interests)\[(\d+)\]/);
  if (m) {
    const section = m[1]!;
    const idx = parseInt(m[2]!, 10);
    const arr = (cv as unknown as Record<string, Array<{ id: string }>>)[section];
    if (!arr || !arr[idx]) return null;
    return { sectionId: section, itemId: arr[idx].id };
  }
  if (/^(experiences|formations|skills|languages|interests)$/.test(path)) {
    return { sectionId: path, itemId: "" };
  }
  return null;
}

const PERSONAL_LABELS: Record<string, string> = {
  firstName: "Prénom",
  lastName: "Nom",
  name: "Nom",
  jobTitle: "Intitulé du poste",
  summary: "Résumé",
  email: "Email",
  phone: "Téléphone",
  city: "Ville",
  linkedinUrl: "LinkedIn",
  portfolioUrl: "Portfolio",
  portfolioDisplay: "Portfolio",
  photoUrl: "Photo",
};

const SECTION_LABELS: Record<string, string> = {
  experiences: "Expériences",
  formations: "Formations",
  skills: "Compétences",
  languages: "Langues",
  interests: "Centres d'intérêt",
};

export function humanizePath(path: string): string {
  if (path.startsWith("personalInfo.")) {
    const field = path.slice("personalInfo.".length);
    return PERSONAL_LABELS[field] ?? field;
  }
  const m = path.match(/^(experiences|formations|skills|languages|interests)/);
  if (m) {
    const section = m[1]!;
    const label = SECTION_LABELS[section] ?? section;
    if (/\.bullets\[/.test(path)) return `${label} · bullet`;
    return label;
  }
  return path;
}
