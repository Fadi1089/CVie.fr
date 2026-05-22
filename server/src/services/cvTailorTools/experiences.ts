import { z } from "zod";
import { tool } from "ai";
import type { MasterCvData } from "@cvie/shared";
import { newId, type WorkingCv, type ToolResult } from "./index";

export function buildSelectExperience(master: MasterCvData, working: WorkingCv) {
  return tool({
    description: "Sélectionne une expérience du master; choisit les achievements à transformer en bullets.",
    inputSchema: z.object({
      masterId: z.string(),
      achievementIndices: z.array(z.number().int().nonnegative()).max(15),
      bulletRewrites: z.record(z.string(), z.string().max(2000)).optional(),
      jobTitleRewrite: z.string().max(500).optional(),
    }),
    execute: async ({ masterId, achievementIndices, bulletRewrites, jobTitleRewrite }): Promise<ToolResult> => {
      const m = master.experiences.find((e) => e.id === masterId);
      if (!m) return { ok: false, error: "unknown_master_id" };
      if (achievementIndices.some((i) => i >= m.achievements.length)) return { ok: false, error: "bad_index" };

      const newExpId = newId("exp");
      const bullets: string[] = [];
      const expIdx = working.cv.experiences.length;
      achievementIndices.forEach((i, slot) => {
        const orig = m.achievements[i]!;
        const rewrite = bulletRewrites?.[String(i)];
        if (rewrite && rewrite !== orig) {
          bullets.push(rewrite);
          working.pendingChanges.push({ path: `experiences[${expIdx}].bullets[${slot}]`, before: orig, after: rewrite });
        } else {
          bullets.push(orig);
        }
      });

      const jobTitleFinal = jobTitleRewrite && jobTitleRewrite !== m.jobTitle ? jobTitleRewrite : m.jobTitle;
      if (jobTitleRewrite && jobTitleRewrite !== m.jobTitle) {
        working.pendingChanges.push({ path: `experiences[${expIdx}].jobTitle`, before: m.jobTitle, after: jobTitleRewrite });
      }

      working.cv.experiences.push({
        id: newExpId,
        jobTitle: jobTitleFinal, company: m.company, city: m.city,
        startDate: m.startDate, endDate: m.endDate,
        bullets, description: m.description,
      });
      return { ok: true, summary: `Expérience sélectionnée : ${m.jobTitle} chez ${m.company}` };
    },
  });
}
