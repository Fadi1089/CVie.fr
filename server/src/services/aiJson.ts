// Universal output contract appended to every AI prompt that must produce
// JSON. Models — especially Gemini and reasoning models — like to wrap
// output in markdown fences, add preambles ("Here is the JSON:"), or trail
// explanations. Repeat the rules in absolutes; provider-side compliance
// improves significantly when the constraint is restated multiple times in
// the same prompt.
import type { SharedV3ProviderOptions } from "@ai-sdk/provider";
import type { AiProvider } from "@cvie/shared";

// Provider-side hints to force JSON output where the SDK supports it.
// Gemini honors responseMimeType natively. OpenAI honors response_format.
// Anthropic has no equivalent — relies on the prompt contract alone.
export function jsonResponseProviderOptions(
  provider: AiProvider,
): SharedV3ProviderOptions | undefined {
  if (provider === "google") {
    return { google: { responseMimeType: "application/json" } };
  }
  if (provider === "openai") {
    return { openai: { responseFormat: { type: "json_object" } } };
  }
  return undefined;
}

export const JSON_OUTPUT_CONTRACT = `OUTPUT FORMAT — RÈGLES ABSOLUES (à respecter sans exception) :
1. La réponse DOIT être un objet JSON brut, parsable directement par JSON.parse.
2. La réponse commence par le caractère "{" et se termine par le caractère "}". Aucun caractère avant. Aucun caractère après.
3. INTERDIT : balises markdown, code fences (\`\`\`json, \`\`\`, ~~~), backticks, balises XML.
4. INTERDIT : phrase d'introduction ("Voici le JSON", "Réponse :", etc.).
5. INTERDIT : commentaire après le JSON, explication, note de bas de page.
6. INTERDIT : JSON5, trailing commas, commentaires // ou /* */ dans le JSON.
7. Toutes les chaînes doivent utiliser des guillemets droits doubles "..." et échapper correctement les caractères spéciaux.
8. Si une information est inconnue, utiliser "" pour les chaînes et [] pour les tableaux — JAMAIS null sauf si le schéma l'autorise explicitement.

Si tu ne peux pas respecter ces règles, retourne quand même un objet JSON valide minimal conforme au schéma plutôt qu'une réponse en texte libre.`;

// Defensive parsing for AI-generated JSON. The contract above tells the
// model what to do; this parser handles the cases where it ignores us.
//   1. ```json fences (Gemini default),
//   2. prose preface ("Here is the JSON:"),
//   3. trailing explanation after the object.
// Strip fences first, then if parse still fails, extract the substring
// between the first `{` and last `}`.
export function stripJsonFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  return s.trim();
}

export function parseAiJson(raw: string): unknown {
  const stripped = stripJsonFences(raw);
  try {
    return JSON.parse(stripped);
  } catch {
    // Fall through to bracket extraction.
  }
  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  if (first !== -1 && last > first) {
    const slice = stripped.slice(first, last + 1);
    try {
      return JSON.parse(slice);
    } catch {
      // Fall through to thrown error with snippet.
    }
  }
  const preview = raw.slice(0, 200).replace(/\s+/g, " ");
  throw new Error(`AI did not return valid JSON. First 200 chars: ${preview}`);
}
