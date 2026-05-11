import { tool } from "ai";
import { z } from "zod";
import type { Formation } from "@cvie/shared";
import {
  commit,
  diffFields,
  findIndexById,
  makeId,
  type AssistantState,
  type Patch,
  type ToolResult,
} from "./helpers";

const cvDateSchema = z
  .string()
  .refine((v) => v === "" || v === "present" || /^\d{4}-\d{2}$/.test(v), {
    message: "Format de date invalide (YYYY-MM ou 'present')",
  });

const formationInputSchema = z.object({
  degree: z.string().min(1),
  school: z.string().min(1),
  city: z.string().optional(),
  startDate: cvDateSchema,
  endDate: cvDateSchema.optional(),
  description: z.string().optional(),
});

const formationPatchSchema = formationInputSchema.partial();

export function formationTools(state: AssistantState) {
  return {
    addFormation: tool({
      description: "Ajoute une formation. Id généré côté serveur.",
      inputSchema: z.object({
        formation: formationInputSchema,
        position: z.number().int().min(0).optional(),
      }),
      execute: async ({ formation, position }): Promise<ToolResult> => {
        const item: Formation = { id: makeId("form"), ...formation };
        const before = state.cv.formations;
        const insertAt = Math.min(position ?? before.length, before.length);
        const after = [...before.slice(0, insertAt), item, ...before.slice(insertAt)];
        return commit(state, { ...state.cv, formations: after }, [
          { path: "formations", before, after },
        ]);
      },
    }),

    updateFormation: tool({
      description: "Met à jour une formation existante (par id).",
      inputSchema: z.object({
        id: z.string().min(1),
        patch: formationPatchSchema,
      }),
      execute: async ({ id, patch }): Promise<ToolResult> => {
        const idx = findIndexById(state.cv.formations, id);
        if (idx === -1) {
          return { ok: false, error: `Aucune formation avec id="${id}".` };
        }
        const before = state.cv.formations[idx]!;
        const merged: Formation = { ...before, ...patch };
        const arr = [...state.cv.formations];
        arr[idx] = merged;
        const patches: Patch[] = diffFields(`formations[${idx}]`, before, merged);
        if (patches.length === 0) {
          return { ok: true, patches: [], message: "Aucun changement." };
        }
        return commit(state, { ...state.cv, formations: arr }, patches);
      },
    }),

    removeFormation: tool({
      description: "Supprime une formation (par id).",
      inputSchema: z.object({ id: z.string().min(1) }),
      execute: async ({ id }): Promise<ToolResult> => {
        const idx = findIndexById(state.cv.formations, id);
        if (idx === -1) {
          return { ok: false, error: `Aucune formation avec id="${id}".` };
        }
        const before = state.cv.formations;
        const arr = before.filter((f) => f.id !== id);
        return commit(state, { ...state.cv, formations: arr }, [
          { path: "formations", before, after: arr },
        ]);
      },
    }),

    reorderFormations: tool({
      description:
        "Réordonne les formations. Fournir la permutation exacte des ids.",
      inputSchema: z.object({ ids: z.array(z.string().min(1)).min(1) }),
      execute: async ({ ids }): Promise<ToolResult> => {
        const before = state.cv.formations;
        if (
          ids.length !== before.length ||
          new Set(ids).size !== before.length ||
          !ids.every((id) => before.some((f) => f.id === id))
        ) {
          return { ok: false, error: "Permutation invalide." };
        }
        const byId = new Map(before.map((f) => [f.id, f]));
        const after = ids.map((id) => byId.get(id)!);
        return commit(state, { ...state.cv, formations: after }, [
          { path: "formations", before, after },
        ]);
      },
    }),
  };
}
