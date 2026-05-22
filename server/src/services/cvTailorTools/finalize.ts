import { z } from "zod";
import { tool } from "ai";
import { cvDataSchema } from "@cvie/shared";
import type { WorkingCv, ToolResult } from "./index";

export function buildFinalize(working: WorkingCv) {
  return tool({
    description: "Termine la génération. Doit être appelé en dernier.",
    inputSchema: z.object({}),
    execute: async (): Promise<ToolResult> => {
      const parsed = cvDataSchema.safeParse(working.cv);
      if (!parsed.success) {
        return { ok: false, error: `validation_failed:${parsed.error.issues[0]?.message ?? "unknown"}` };
      }
      working.cv = parsed.data;
      return { ok: true, summary: "Finalisé" };
    },
  });
}
