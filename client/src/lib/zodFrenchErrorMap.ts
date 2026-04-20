import { z } from "zod";

/**
 * Installs a French error map as zod's default. Imported once at app
 * bootstrap (for side effect) so every `safeParse` / resolver inherits
 * French error messages without per-schema plumbing.
 *
 * Zod v4 default messages are English (e.g. "Required", "Invalid email").
 * AC2 of Story 2-2 requires French error strings surface in the editor.
 */
const frenchErrorMap: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case "invalid_type":
      if (issue.input === undefined || issue.input === null) {
        return { message: "Champ requis" };
      }
      return { message: "Type invalide" };
    case "too_small": {
      const min = issue.minimum;
      if (issue.origin === "string") {
        return min === 1
          ? { message: "Champ requis" }
          : { message: `Minimum ${min} caractères` };
      }
      if (issue.origin === "array") {
        return { message: `Minimum ${min} entrées` };
      }
      return { message: `Valeur trop petite (min ${min})` };
    }
    case "too_big": {
      const max = issue.maximum;
      if (issue.origin === "string") {
        return { message: `Maximum ${max} caractères` };
      }
      if (issue.origin === "array") {
        return { message: `Maximum ${max} entrées` };
      }
      return { message: `Valeur trop grande (max ${max})` };
    }
    case "invalid_format":
      if (issue.format === "email") return { message: "Adresse e-mail invalide" };
      if (issue.format === "url") return { message: "URL invalide" };
      return { message: "Format invalide" };
    case "invalid_value":
      return { message: "Valeur non autorisée" };
    case "custom":
      return { message: issue.message ?? "Champ invalide" };
    default:
      return { message: "Champ invalide" };
  }
};

z.config({ customError: frenchErrorMap });
