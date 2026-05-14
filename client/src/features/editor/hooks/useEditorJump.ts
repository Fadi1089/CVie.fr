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
  // Item-id form emitted by chip expansion of whole-array patches:
  // `experiences[id:exp_abcd1234]`. Use directly, no cv lookup needed —
  // the id is stable across optimistic apply and matches the DOM
  // attribute on both real rows and removed-item ghost rows.
  const idMatch = path.match(/^(experiences|formations|skills|languages|interests)\[id:([^\]]+)\]/);
  if (idMatch) {
    return { sectionId: idMatch[1]!, itemId: idMatch[2]! };
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

export function humanizePath(path: string, cv?: CvData): string {
  if (path.startsWith("personalInfo.")) {
    const field = path.slice("personalInfo.".length);
    return PERSONAL_LABELS[field] ?? field;
  }
  const m = path.match(/^(experiences|formations|skills|languages|interests)/);
  if (m) {
    const section = m[1]!;
    const label = SECTION_LABELS[section] ?? section;
    if (/\.bullets\[/.test(path)) return `${label} · bullet`;
    if (cv) {
      const idMatch = path.match(
        /^(experiences|formations|skills|languages|interests)\[id:([^\]]+)\]/,
      );
      const idxMatch = path.match(
        /^(experiences|formations|skills|languages|interests)\[(\d+)\]/,
      );
      const arr = (cv as unknown as Record<string, Array<Record<string, unknown>>>)[section];
      let item: Record<string, unknown> | undefined;
      if (idMatch && Array.isArray(arr)) {
        item = arr.find((x) => x.id === idMatch[2]);
      } else if (idxMatch && Array.isArray(arr)) {
        item = arr[parseInt(idxMatch[2]!, 10)];
      }
      const sub = item ? itemLabel(section, item) : undefined;
      if (sub) return `${label} · ${sub}`;
    }
    return label;
  }
  return path;
}

function itemLabel(section: string, item: Record<string, unknown>): string | undefined {
  const get = (k: string) => {
    const v = item[k];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
  };
  if (section === "experiences") return get("jobTitle") ?? get("company");
  if (section === "formations") return get("degree") ?? get("school");
  return get("name");
}
