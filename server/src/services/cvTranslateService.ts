import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import {
  cvDataSchema,
  type AiProvider,
  type CvData,
  type LocaleCode,
} from "@cvie/shared";

const LANGUAGE_LABEL: Record<LocaleCode, string> = {
  fr: "français",
  en: "anglais",
  de: "allemand",
  es: "espagnol",
  nl: "néerlandais",
};

const SYSTEM_PROMPT = (targetLabel: string) => `Tu es un traducteur professionnel de CV.
Tu reçois un CV au format JSON et tu dois retourner le même CV traduit en ${targetLabel}.

Règles strictes — appliquer toutes :
- Traduire UNIQUEMENT les champs textuels rédigés (summary, jobTitle, position, description, bullets, degree, school, headline, category, interest names quand génériques).
- NE PAS traduire les noms propres : prénoms, noms de famille, entreprises, écoles, villes, technologies, langages de programmation, marques, intitulés de diplômes officiels (BUT, BTS, DUT, Master, etc.).
- NE PAS modifier : ids, dates (YYYY-MM ou "present"), URLs, emails, numéros de téléphone, photoUrl, portfolioDisplay.
- CONSERVER À L'IDENTIQUE les enums :
  - skill.level : "débutant" | "intermédiaire" | "avancé" | "expert" (valeurs françaises exactes, peu importe la langue cible)
  - language.level : "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "natif" ("natif" reste en français)
- Conserver toutes les structures, tableaux, et clés exactement comme reçus.
- Si appearance.locale est présent, le mettre à jour vers la langue cible.

Retourne UNIQUEMENT le CV traduit en JSON valide, sans markdown, sans backticks, sans texte avant/après. Le JSON doit être directement parsable.`;

function buildModel(provider: AiProvider, apiKey: string) {
  if (provider === "openai") {
    return createOpenAI({ apiKey })("gpt-4o-mini");
  }
  return createAnthropic({ apiKey })("claude-haiku-4-5-20251001");
}

function stripJsonFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  return s.trim();
}

export async function translateCv(
  cv: CvData,
  target: LocaleCode,
  provider: AiProvider,
  apiKey: string,
): Promise<CvData> {
  const label = LANGUAGE_LABEL[target];
  const { text } = await generateText({
    model: buildModel(provider, apiKey),
    system: SYSTEM_PROMPT(label),
    prompt: `CV source (JSON) à traduire en ${label} :\n\n${JSON.stringify(cv)}`,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(text));
  } catch {
    throw new Error("Réponse IA non JSON");
  }

  const result = cvDataSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Réponse IA invalide: ${result.error.issues[0]?.message ?? "schéma non respecté"}`,
    );
  }
  return result.data;
}
