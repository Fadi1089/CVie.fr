import { tool } from "ai";
import { z } from "zod";
import type { Experience } from "@cvie/shared";
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

const experienceInputSchema = z.object({
  jobTitle: z.string().min(1),
  company: z.string().min(1),
  city: z.string().optional(),
  startDate: cvDateSchema,
  endDate: cvDateSchema.optional(),
  bullets: z.array(z.string()).optional(),
  description: z.string().optional(),
});

const experiencePatchSchema = experienceInputSchema.partial();

export function experienceTools(state: AssistantState) {
  return {
    addExperience: tool({
      description:
        "Ajoute une expérience professionnelle. L'id est généré côté serveur. Position optionnelle (0 = en tête).",
      inputSchema: z.object({
        experience: experienceInputSchema,
        position: z.number().int().min(0).optional(),
      }),
      execute: async ({ experience, position }): Promise<ToolResult> => {
        const item: Experience = {
          id: makeId("exp"),
          jobTitle: experience.jobTitle,
          company: experience.company,
          city: experience.city,
          startDate: experience.startDate,
          endDate: experience.endDate,
          bullets: experience.bullets ?? [],
          description: experience.description,
        };
        const before = state.cv.experiences;
        const insertAt = Math.min(position ?? before.length, before.length);
        const after = [...before.slice(0, insertAt), item, ...before.slice(insertAt)];
        return commit(state, { ...state.cv, experiences: after }, [
          { path: `experiences[${insertAt}]`, before: null, after: item },
        ]);
      },
    }),

    updateExperience: tool({
      description:
        "Met à jour une expérience existante (par id) avec un patch partiel. Préserve l'id.",
      inputSchema: z.object({
        id: z.string().min(1),
        patch: experiencePatchSchema,
      }),
      execute: async ({ id, patch }): Promise<ToolResult> => {
        const idx = findIndexById(state.cv.experiences, id);
        if (idx === -1) {
          return { ok: false, error: `Aucune expérience avec id="${id}".` };
        }
        const before = state.cv.experiences[idx]!;
        const merged: Experience = {
          ...before,
          ...patch,
          bullets: patch.bullets ?? before.bullets,
        };
        const arr = [...state.cv.experiences];
        arr[idx] = merged;
        const patches: Patch[] = diffFields(`experiences[${idx}]`, before, merged);
        if (patches.length === 0) {
          return { ok: true, patches: [], message: "Aucun changement." };
        }
        return commit(state, { ...state.cv, experiences: arr }, patches);
      },
    }),

    removeExperience: tool({
      description: "Supprime une expérience (par id).",
      inputSchema: z.object({ id: z.string().min(1) }),
      execute: async ({ id }): Promise<ToolResult> => {
        const idx = findIndexById(state.cv.experiences, id);
        if (idx === -1) {
          return { ok: false, error: `Aucune expérience avec id="${id}".` };
        }
        const before = state.cv.experiences[idx]!;
        const arr = state.cv.experiences.filter((e) => e.id !== id);
        return commit(state, { ...state.cv, experiences: arr }, [
          { path: `experiences[${idx}]`, before, after: null },
        ]);
      },
    }),

    reorderExperiences: tool({
      description:
        "Réordonne les expériences. Fournir la liste exhaustive des ids existants dans le nouvel ordre.",
      inputSchema: z.object({ ids: z.array(z.string().min(1)).min(1) }),
      execute: async ({ ids }): Promise<ToolResult> => {
        const before = state.cv.experiences;
        if (
          ids.length !== before.length ||
          new Set(ids).size !== before.length ||
          !ids.every((id) => before.some((e) => e.id === id))
        ) {
          return {
            ok: false,
            error:
              "La liste d'ids doit être une permutation exacte des ids existants.",
          };
        }
        const byId = new Map(before.map((e) => [e.id, e]));
        const after = ids.map((id) => byId.get(id)!);
        return commit(state, { ...state.cv, experiences: after }, [
          { path: "experiences", before, after },
        ]);
      },
    }),

    addExperienceBullet: tool({
      description:
        "Ajoute un bullet point à une expérience. Position optionnelle (0 = en tête).",
      inputSchema: z.object({
        experienceId: z.string().min(1),
        text: z.string().min(1),
        position: z.number().int().min(0).optional(),
      }),
      execute: async ({ experienceId, text, position }): Promise<ToolResult> => {
        const idx = findIndexById(state.cv.experiences, experienceId);
        if (idx === -1) {
          return { ok: false, error: `Aucune expérience avec id="${experienceId}".` };
        }
        const exp = state.cv.experiences[idx]!;
        const bullets = [...(exp.bullets ?? [])];
        const insertAt = Math.min(position ?? bullets.length, bullets.length);
        bullets.splice(insertAt, 0, text);
        const merged: Experience = { ...exp, bullets };
        const arr = [...state.cv.experiences];
        arr[idx] = merged;
        return commit(state, { ...state.cv, experiences: arr }, [
          { path: `experiences[${idx}].bullets[${insertAt}]`, before: null, after: text },
        ]);
      },
    }),

    updateExperienceBullet: tool({
      description: "Remplace le texte d'un bullet existant.",
      inputSchema: z.object({
        experienceId: z.string().min(1),
        index: z.number().int().min(0),
        text: z.string().min(1),
      }),
      execute: async ({ experienceId, index, text }): Promise<ToolResult> => {
        const idx = findIndexById(state.cv.experiences, experienceId);
        if (idx === -1) {
          return { ok: false, error: `Aucune expérience avec id="${experienceId}".` };
        }
        const exp = state.cv.experiences[idx]!;
        if (index >= exp.bullets.length) {
          return { ok: false, error: `Index ${index} hors limites (${exp.bullets.length} bullets).` };
        }
        const bullets = [...exp.bullets];
        const before = bullets[index];
        bullets[index] = text;
        const merged: Experience = { ...exp, bullets };
        const arr = [...state.cv.experiences];
        arr[idx] = merged;
        return commit(state, { ...state.cv, experiences: arr }, [
          { path: `experiences[${idx}].bullets[${index}]`, before, after: text },
        ]);
      },
    }),

    removeExperienceBullet: tool({
      description: "Supprime un bullet d'une expérience.",
      inputSchema: z.object({
        experienceId: z.string().min(1),
        index: z.number().int().min(0),
      }),
      execute: async ({ experienceId, index }): Promise<ToolResult> => {
        const idx = findIndexById(state.cv.experiences, experienceId);
        if (idx === -1) {
          return { ok: false, error: `Aucune expérience avec id="${experienceId}".` };
        }
        const exp = state.cv.experiences[idx]!;
        if (index >= exp.bullets.length) {
          return { ok: false, error: `Index ${index} hors limites.` };
        }
        const bullets = [...exp.bullets];
        const before = bullets[index];
        bullets.splice(index, 1);
        const merged: Experience = { ...exp, bullets };
        const arr = [...state.cv.experiences];
        arr[idx] = merged;
        return commit(state, { ...state.cv, experiences: arr }, [
          { path: `experiences[${idx}].bullets[${index}]`, before, after: null },
        ]);
      },
    }),
  };
}
