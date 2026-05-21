import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  cvDataSchema,
  type AiProvider,
  type CvData,
  type LocaleCode,
} from "@cvie/shared";
import {
  JSON_OUTPUT_CONTRACT,
  jsonResponseProviderOptions,
  parseAiJson,
} from "./aiJson";
import { buildUserInstructionsBlock } from "./aiInstructions";

const LANGUAGE_LABEL: Record<LocaleCode, string> = {
  fr: "français",
  en: "anglais",
  de: "allemand",
  es: "espagnol",
  nl: "néerlandais",
};

const SYSTEM_PROMPT = (
  targetLabel: string,
  userInstructions: string | null,
) => `Tu es un traducteur professionnel de CV.
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

${userInstructions ? `${userInstructions}\n\n` : ""}${JSON_OUTPUT_CONTRACT}`;

function buildModel(provider: AiProvider, apiKey: string, model: string) {
  if (provider === "openai") {
    return createOpenAI({ apiKey })(model);
  }
  if (provider === "google") {
    return createGoogleGenerativeAI({ apiKey })(model);
  }
  return createAnthropic({ apiKey })(model);
}

export type TranslateCvArgs = {
  userId: string | null;
  cv: CvData;
  target: LocaleCode;
  provider: AiProvider;
  apiKey: string;
  model: string;
};

export async function translateCv(args: TranslateCvArgs): Promise<CvData> {
  const label = LANGUAGE_LABEL[args.target];
  const userInstructions = args.userId
    ? await buildUserInstructionsBlock(args.userId)
    : null;
  const { text } = await generateText({
    model: buildModel(args.provider, args.apiKey, args.model),
    system: SYSTEM_PROMPT(label, userInstructions),
    prompt: `CV source (JSON) à traduire en ${label} :\n\n${JSON.stringify(args.cv)}`,
    providerOptions: jsonResponseProviderOptions(args.provider),
  });

  let parsed: unknown;
  try {
    parsed = parseAiJson(text);
  } catch (err) {
    console.error(
      "[cv/translate] raw model output (first 500 chars):",
      text.slice(0, 500),
    );
    throw new Error(
      err instanceof Error
        ? `Réponse IA non JSON. ${err.message}`
        : "Réponse IA non JSON",
    );
  }

  const result = cvDataSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Réponse IA invalide: ${result.error.issues[0]?.message ?? "schéma non respecté"}`,
    );
  }
  return result.data;
}
