import type { AiProvider } from "../aiKeys/providers";

export type ModelOption = {
  id: string;
  label: string;
  /** Short one-liner shown under the model id in the picker. */
  hint: string;
};

export const AI_MODELS: Record<AiProvider, ModelOption[]> = {
  anthropic: [
    {
      id: "claude-opus-4-7",
      label: "Claude Opus 4.7",
      hint: "Le plus capable — extraction nuancée, raisonnement long.",
    },
    {
      id: "claude-sonnet-4-6",
      label: "Claude Sonnet 4.6",
      hint: "Équilibre qualité / coût, recommandé par défaut.",
    },
    {
      id: "claude-haiku-4-5-20251001",
      label: "Claude Haiku 4.5",
      hint: "Rapide et économique, idéal pour l'import en masse.",
    },
  ],
  openai: [
    {
      id: "gpt-4o",
      label: "GPT-4o",
      hint: "Multimodal, fort en extraction structurée.",
    },
    {
      id: "gpt-4o-mini",
      label: "GPT-4o mini",
      hint: "Petit, rapide, bon marché.",
    },
  ],
  google: [
    {
      id: "gemini-2.5-pro",
      label: "Gemini 2.5 Pro",
      hint: "Contextes très longs, vision native.",
    },
    {
      id: "gemini-2.5-flash",
      label: "Gemini 2.5 Flash",
      hint: "Inférence très rapide pour traduction.",
    },
  ],
};

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
};

export function defaultModelFor(provider: AiProvider): string {
  const first = AI_MODELS[provider][0];
  if (!first) {
    throw new Error(`No models configured for provider ${provider}`);
  }
  return first.id;
}

export function isValidModel(provider: AiProvider, model: string): boolean {
  return AI_MODELS[provider].some((m) => m.id === model);
}

export function findModel(
  provider: AiProvider,
  model: string,
): ModelOption | null {
  return AI_MODELS[provider].find((m) => m.id === model) ?? null;
}
