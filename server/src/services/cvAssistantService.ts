import {
  convertToModelMessages,
  streamText,
  type StreamTextResult,
  type ToolSet,
  type UIMessage,
} from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { AiProvider, CvData } from "@cvie/shared";
import { buildAssistantTools, type AssistantState } from "./aiTools";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StreamResult = StreamTextResult<ToolSet, any>;

const SYSTEM_PROMPT_FR = `Tu es l'assistant rédacteur du CV de l'utilisateur, intégré dans l'éditeur cvie.fr.

RÔLE
- Aider à rédiger, restructurer, ajouter ou supprimer des éléments du CV en français (ou la langue du CV en cours).
- Utiliser EXCLUSIVEMENT les outils fournis pour proposer des modifications. Ne JAMAIS coller un CV complet en texte.
- Si une question est conversationnelle (clarification, conseil), répondre en prose sans appeler d'outil.

CE QUE TU PEUX MODIFIER
- personalInfo (nom, prénom, email, téléphone, ville, intitulé de poste, résumé, URLs, photo).
- experiences (incluant les bullets), formations, skills, languages, interests.

CE QUE TU NE PEUX PAS MODIFIER
- L'apparence (couleurs, polices, espacements).
- La langue de l'interface ou la locale du CV.
- Les pièces jointes envoyées par l'utilisateur (PDFs, images).

RÈGLES
- Ne JAMAIS inventer d'expérience, de date, de diplôme ou d'employeur que l'utilisateur n'a pas mentionné.
- Conserver le registre de l'utilisateur (sa façon d'écrire dans le CV courant).
- Pour les ajouts (expérience, formation, compétence), ne pas inventer les ids — les outils les génèrent.
- Pour modifier ou supprimer un élément existant, utiliser son id exact tel qu'il apparaît dans l'état du CV.
- Un seul outil par modification logique. Pour plusieurs changements, enchaîner plusieurs appels d'outils dans la même réponse.
- Si un outil retourne { ok: false }, lire l'erreur, corriger l'input, et réessayer une fois maximum.
- Avant de proposer des changements importants, demander brièvement confirmation à l'utilisateur.`;

function buildModel(provider: AiProvider, apiKey: string, model: string) {
  if (provider === "openai") {
    return createOpenAI({ apiKey })(model);
  }
  if (provider === "google") {
    return createGoogleGenerativeAI({ apiKey })(model);
  }
  return createAnthropic({ apiKey })(model);
}

export type RunAssistantArgs = {
  cv: CvData;
  messages: UIMessage[];
  provider: AiProvider;
  apiKey: string;
  model: string;
  maxOutputTokens?: number;
};

const DEFAULT_MAX_OUTPUT_TOKENS = 4096;

export async function runAssistant(
  args: RunAssistantArgs,
): Promise<{ result: StreamResult; state: AssistantState }> {
  const { state, tools } = buildAssistantTools(args.cv);
  const modelMessages = await convertToModelMessages(args.messages);
  const result = streamText({
    model: buildModel(args.provider, args.apiKey, args.model),
    system: `${SYSTEM_PROMPT_FR}\n\nÉTAT INITIAL DU CV:\n${JSON.stringify(args.cv, null, 2)}`,
    messages: modelMessages,
    tools,
    stopWhen: ({ steps }) => steps.length >= 6,
    maxOutputTokens: args.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
  });
  return { result: result as unknown as StreamResult, state };
}
