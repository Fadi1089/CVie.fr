import { z } from "zod";
import { tool } from "ai";
import { newId, type WorkingCv, type ToolResult } from "./index";
import type { MasterCvData } from "@cvie/shared";

export function buildSelectInterests(master: MasterCvData, working: WorkingCv) {
  return tool({
    description: "Sélectionne plusieurs intérêts du master.",
    inputSchema: z.object({ masterIds: z.array(z.string()).max(40) }),
    execute: async ({ masterIds }): Promise<ToolResult> => {
      for (const id of masterIds) {
        const m = master.interests.find((i) => i.id === id);
        if (!m) return { ok: false, error: `unknown_master_id:${id}` };
        working.cv.interests.push({ id: newId("int"), name: m.name });
      }
      return { ok: true, summary: `${masterIds.length} intérêts sélectionnés` };
    },
  });
}
