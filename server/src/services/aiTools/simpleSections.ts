import { tool } from "ai";
import { z } from "zod";
import type { Interest, Language, Skill } from "@cvie/shared";
import {
  commit,
  diffFields,
  findIndexById,
  makeId,
  type AssistantState,
  type Patch,
  type ToolResult,
} from "./helpers";

const skillInputSchema = z.object({
  name: z.string().min(1),
  level: z.enum(["débutant", "intermédiaire", "avancé", "expert"]).optional(),
  category: z.string().optional(),
});
const skillPatchSchema = skillInputSchema.partial();

const languageInputSchema = z.object({
  name: z.string().min(1),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "natif"]),
});
const languagePatchSchema = languageInputSchema.partial();

const interestInputSchema = z.object({ name: z.string().min(1) });
const interestPatchSchema = interestInputSchema.partial();

// Generic CRUD factory — `skills`, `languages`, `interests` share the same
// shape (id-keyed array, no nested children, no refinements), so the four
// operations (add / update / remove / reorder) are identical modulo the
// section key and item schema.
type Section = "skills" | "languages" | "interests";

function arrayCrud<T extends { id: string }>(
  state: AssistantState,
  section: Section,
  idPrefix: string,
  inputSchema: z.ZodTypeAny,
  patchSchema: z.ZodTypeAny,
  labelFr: string,
) {
  const list = (): readonly T[] => state.cv[section] as unknown as readonly T[];
  return {
    add: tool({
      description: `Ajoute ${labelFr}. Id généré côté serveur.`,
      inputSchema: z.object({
        item: inputSchema,
        position: z.number().int().min(0).optional(),
      }),
      execute: async ({ item, position }): Promise<ToolResult> => {
        const built = { id: makeId(idPrefix), ...(item as Record<string, unknown>) } as T;
        const before = list();
        const insertAt = Math.min(position ?? before.length, before.length);
        const after = [...before.slice(0, insertAt), built, ...before.slice(insertAt)];
        return commit(state, { ...state.cv, [section]: after }, [
          { path: `${section}[${insertAt}]`, before: null, after: built },
        ]);
      },
    }),
    update: tool({
      description: `Met à jour ${labelFr} (par id).`,
      inputSchema: z.object({ id: z.string().min(1), patch: patchSchema }),
      execute: async ({ id, patch }): Promise<ToolResult> => {
        const idx = findIndexById(list(), id);
        if (idx === -1) return { ok: false, error: `Aucun ${labelFr} avec id="${id}".` };
        const before = list()[idx]!;
        const merged = { ...before, ...(patch as Record<string, unknown>) } as T;
        const arr = [...list()];
        arr[idx] = merged;
        const patches: Patch[] = diffFields(`${section}[${idx}]`, before, merged);
        if (patches.length === 0) return { ok: true, patches: [], message: "Aucun changement." };
        return commit(state, { ...state.cv, [section]: arr }, patches);
      },
    }),
    remove: tool({
      description: `Supprime ${labelFr} (par id).`,
      inputSchema: z.object({ id: z.string().min(1) }),
      execute: async ({ id }): Promise<ToolResult> => {
        const idx = findIndexById(list(), id);
        if (idx === -1) return { ok: false, error: `Aucun ${labelFr} avec id="${id}".` };
        const before = list()[idx]!;
        const arr = list().filter((e) => e.id !== id);
        return commit(state, { ...state.cv, [section]: arr }, [
          { path: `${section}[${idx}]`, before, after: null },
        ]);
      },
    }),
    reorder: tool({
      description: `Réordonne ${labelFr}s. Permutation exacte des ids.`,
      inputSchema: z.object({ ids: z.array(z.string().min(1)).min(1) }),
      execute: async ({ ids }): Promise<ToolResult> => {
        const before = list();
        if (
          ids.length !== before.length ||
          new Set(ids).size !== before.length ||
          !ids.every((id) => before.some((e) => e.id === id))
        ) {
          return { ok: false, error: "Permutation invalide." };
        }
        const byId = new Map(before.map((e) => [e.id, e]));
        const after = ids.map((id) => byId.get(id)!);
        return commit(state, { ...state.cv, [section]: after }, [
          { path: section, before, after },
        ]);
      },
    }),
  };
}

export function skillTools(state: AssistantState) {
  const t = arrayCrud<Skill>(state, "skills", "skill", skillInputSchema, skillPatchSchema, "une compétence");
  return { addSkill: t.add, updateSkill: t.update, removeSkill: t.remove, reorderSkills: t.reorder };
}

export function languageTools(state: AssistantState) {
  const t = arrayCrud<Language>(state, "languages", "lang", languageInputSchema, languagePatchSchema, "une langue");
  return { addLanguage: t.add, updateLanguage: t.update, removeLanguage: t.remove, reorderLanguages: t.reorder };
}

export function interestTools(state: AssistantState) {
  const t = arrayCrud<Interest>(state, "interests", "int", interestInputSchema, interestPatchSchema, "un centre d'intérêt");
  return { addInterest: t.add, updateInterest: t.update, removeInterest: t.remove, reorderInterests: t.reorder };
}
