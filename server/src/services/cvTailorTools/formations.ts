import { z } from "zod";
import { tool } from "ai";
import { newId, type WorkingCv, type ToolResult } from "./index";
import type { MasterCvData } from "@cvie/shared";

export function buildSelectFormation(master: MasterCvData, working: WorkingCv) {
  return tool({
    description: "Sélectionne une formation du master.",
    inputSchema: z.object({
      masterId: z.string(),
      descriptionRewrite: z.string().max(2000).optional(),
    }),
    execute: async ({ masterId, descriptionRewrite }): Promise<ToolResult> => {
      const m = master.formations.find((f) => f.id === masterId);
      if (!m) return { ok: false, error: "unknown_master_id" };
      const idx = working.cv.formations.length;
      const desc = descriptionRewrite && descriptionRewrite !== m.description ? descriptionRewrite : m.description;
      if (descriptionRewrite && descriptionRewrite !== m.description) {
        working.pendingChanges.push({ path: `formations[${idx}].description`, before: m.description, after: descriptionRewrite });
      }
      working.cv.formations.push({
        id: newId("form"),
        degree: m.degree, school: m.school, city: m.city, startDate: m.startDate, endDate: m.endDate, description: desc,
      });
      return { ok: true, summary: `Formation sélectionnée : ${m.degree}` };
    },
  });
}
