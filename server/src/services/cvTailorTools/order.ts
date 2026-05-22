import { z } from "zod";
import { tool } from "ai";
import type { WorkingCv, ToolResult } from "./index";

export function buildSetOrder(working: WorkingCv) {
  return tool({
    description: "Réordonne les sections (par ids déjà sélectionnés).",
    inputSchema: z.object({
      experiences: z.array(z.string()).optional(),
      formations: z.array(z.string()).optional(),
      skills: z.array(z.string()).optional(),
    }),
    execute: async ({ experiences, formations, skills }): Promise<ToolResult> => {
      const reorder = <T extends { id: string }>(arr: T[], order?: string[]) => {
        if (!order) return arr;
        const m = new Map(arr.map((x) => [x.id, x]));
        const out = order.map((id) => m.get(id)).filter((x): x is T => Boolean(x));
        return out.length === arr.length ? out : arr; // partial = ignore
      };
      working.cv.experiences = reorder(working.cv.experiences, experiences);
      working.cv.formations = reorder(working.cv.formations, formations);
      working.cv.skills = reorder(working.cv.skills, skills);
      return { ok: true, summary: "Ordre établi" };
    },
  });
}
