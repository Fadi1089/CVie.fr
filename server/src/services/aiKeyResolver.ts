import { getDecryptedKey } from "./aiKeyService";
import type { AiProvider } from "@cvie/shared";

export type ResolvedKey = { key: string; source: "byok" | "server" };

const ENV_KEY: Record<AiProvider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
};

export async function resolveProviderKey(
  userId: string | null,
  provider: AiProvider,
): Promise<ResolvedKey | null> {
  if (userId) {
    const byok = await getDecryptedKey(userId, provider);
    if (byok) return { key: byok, source: "byok" };
  }
  const envKey = process.env[ENV_KEY[provider]];
  if (envKey && envKey.length > 0) return { key: envKey, source: "server" };
  return null;
}
