export const AI_PROVIDERS = ["anthropic", "openai", "google"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_KEY_PREFIX: Record<AiProvider, string> = {
  anthropic: "sk-ant-",
  openai: "sk-",
  google: "AIza",
};

export const AI_KEY_MIN = 20;
export const AI_KEY_MAX = 256;

export function isAiProvider(v: unknown): v is AiProvider {
  return typeof v === "string" && (AI_PROVIDERS as readonly string[]).includes(v);
}

export type ValidateKeyResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateKey(provider: AiProvider, key: string): ValidateKeyResult {
  if (key.length < AI_KEY_MIN || key.length > AI_KEY_MAX) {
    return { ok: false, reason: `Longueur invalide (${AI_KEY_MIN}–${AI_KEY_MAX}).` };
  }
  if (!key.startsWith(AI_KEY_PREFIX[provider])) {
    return { ok: false, reason: `Doit commencer par "${AI_KEY_PREFIX[provider]}".` };
  }
  return { ok: true };
}
