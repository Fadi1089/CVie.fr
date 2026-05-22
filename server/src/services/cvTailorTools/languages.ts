import { z } from "zod";
import { tool } from "ai";
import { newId, type WorkingCv, type ToolResult } from "./index";
import type { MasterCvData } from "@cvie/shared";

export function buildSelectLanguages(master: MasterCvData, working: WorkingCv) {
  return tool({
    description: "Sélectionne plusieurs langues du master.",
    inputSchema: z.object({ masterIds: z.array(z.string()).max(20) }),
    execute: async ({ masterIds }): Promise<ToolResult> => {
      for (const id of masterIds) {
        const m = master.languages.find((l) => l.id === id);
        if (!m) return { ok: false, error: `unknown_master_id:${id}` };
        working.cv.languages.push({ id: newId("lng"), name: m.name, level: m.level });
      }
      return { ok: true, summary: `${masterIds.length} langues sélectionnées` };
    },
  });
}
