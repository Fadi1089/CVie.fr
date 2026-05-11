import { tool } from "ai";
import { z } from "zod";
import { commit, diffFields, type AssistantState, type ToolResult } from "./helpers";

// Loose input — `commit()` runs the full cvDataSchema after the merge so any
// invalid value (bad URL, oversize string, etc.) bubbles back to the model as
// a tool error. Keeping the tool-input schema permissive lets us return a
// targeted FR error message instead of a Zod prefix-coerce failure.
const patchSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    jobTitle: z.string().optional(),
    summary: z.string().optional(),
    linkedinUrl: z.string().optional(),
    portfolioUrl: z.string().optional(),
    portfolioDisplay: z.enum(["cleartext", "qr", "clickable"]).optional(),
    photoUrl: z.string().optional(),
  })
  .strict();

export function personalInfoTools(state: AssistantState) {
  return {
    setPersonalInfo: tool({
      description:
        "Met à jour un ou plusieurs champs de personalInfo (firstName, lastName, email, phone, city, jobTitle, summary, linkedinUrl, portfolioUrl, photoUrl). Ne passe QUE les champs à modifier. Préserve la langue d'origine du CV.",
      inputSchema: z.object({
        patch: patchSchema.describe(
          "Sous-ensemble des champs personalInfo à mettre à jour.",
        ),
      }),
      execute: async ({ patch }): Promise<ToolResult> => {
        const before = state.cv.personalInfo;
        const after = { ...before, ...patch };
        const next = { ...state.cv, personalInfo: after };
        const patches = diffFields("personalInfo", before, after);
        if (patches.length === 0) {
          return { ok: true, patches: [], message: "Aucun changement." };
        }
        return commit(state, next, patches);
      },
    }),
  };
}
