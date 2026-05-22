import { z } from "zod";
import { tool } from "ai";
import { newId, type WorkingCv, type ToolResult } from "./index";
import type { MasterCvData } from "@cvie/shared";

export function buildSelectProject(master: MasterCvData, working: WorkingCv) {
  return tool({
    description: "Sélectionne un projet du master, qui sera ajouté à la section expériences.",
    inputSchema: z.object({
      masterId: z.string(),
      descriptionRewrite: z.string().max(2000).optional(),
    }),
    execute: async ({ masterId, descriptionRewrite }): Promise<ToolResult> => {
      const p = master.projects.find((x) => x.id === masterId);
      if (!p) return { ok: false, error: "unknown_master_id" };
      const desc = descriptionRewrite && descriptionRewrite !== p.description ? descriptionRewrite : p.description;
      if (descriptionRewrite && descriptionRewrite !== p.description) {
        working.pendingChanges.push({ path: `experiences[0].description`, before: p.description, after: descriptionRewrite });
      }
      working.cv.experiences.unshift({
        id: newId("exp"),
        jobTitle: `[Projet] ${p.name}`,
        company: p.role ?? "",
        startDate: p.startDate ?? "",
        endDate: p.endDate,
        bullets: [],
        description: desc,
      });
      return { ok: true, summary: `Projet sélectionné : ${p.name}` };
    },
  });
}
