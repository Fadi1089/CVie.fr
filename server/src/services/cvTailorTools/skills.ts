import { z } from "zod";
import { tool } from "ai";
import { newId, type WorkingCv, type ToolResult } from "./index";
import type { MasterCvData } from "@cvie/shared";

export function buildSelectSkills(master: MasterCvData, working: WorkingCv) {
  return tool({
    description: "Sélectionne plusieurs compétences du master.",
    inputSchema: z.object({ masterIds: z.array(z.string()).max(50) }),
    execute: async ({ masterIds }): Promise<ToolResult> => {
      for (const id of masterIds) {
        const m = master.skills.find((s) => s.id === id);
        if (!m) return { ok: false, error: `unknown_master_id:${id}` };
        working.cv.skills.push({ id: newId("sk"), name: m.name, level: m.level, category: m.category });
      }
      return { ok: true, summary: `${masterIds.length} compétences sélectionnées` };
    },
  });
}
