import { z } from "zod";
import { tool } from "ai";
import type { MasterCvData } from "@cvie/shared";
import { type WorkingCv, type ToolResult } from "./index";

export function buildSetPersonalInfo(master: MasterCvData, working: WorkingCv) {
  return tool({
    description: "Copie personalInfo du master; choisit la variante de résumé.",
    inputSchema: z.object({
      summaryId: z.string(),
      summaryRewrite: z.string().max(2000).optional(),
    }),
    execute: async ({ summaryId, summaryRewrite }): Promise<ToolResult> => {
      const variant = master.summaries.find((s) => s.id === summaryId);
      if (!variant) return { ok: false, error: "unknown_summary_id" };
      working.cv.personalInfo = { ...master.personalInfo };
      if (summaryRewrite && summaryRewrite !== variant.text) {
        working.cv.personalInfo.summary = summaryRewrite;
        working.pendingChanges.push({ path: "personalInfo.summary", before: variant.text, after: summaryRewrite });
      } else {
        working.cv.personalInfo.summary = variant.text;
      }
      return { ok: true, summary: "Profil sélectionné" };
    },
  });
}
