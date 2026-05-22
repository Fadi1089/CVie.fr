import { randomBytes } from "crypto";
import type { CvData, MasterCvData } from "@cvie/shared";

export type PendingChange = { path: string; before: unknown; after: unknown };

export type WorkingCv = {
  cv: CvData;
  pendingChanges: PendingChange[];
};

export function newId(prefix: string) {
  return `${prefix}_${randomBytes(4).toString("hex")}`;
}

export function emptyWorkingCv(templateId: string): WorkingCv {
  return {
    cv: {
      personalInfo: { firstName: "", lastName: "", portfolioDisplay: "clickable" },
      experiences: [], formations: [], skills: [], languages: [], interests: [],
      themeId: templateId,
      customization: {},
    },
    pendingChanges: [],
  };
}

export type ToolResult = { ok: true; summary: string } | { ok: false; error: string };
