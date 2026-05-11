import { prisma } from "../lib/prisma";
import {
  AI_FEATURES,
  AI_PROVIDERS,
  defaultModelFor,
  isAiFeature,
  isAiProvider,
  isValidModel,
  type AiFeature,
  type AiProvider,
} from "@cvie/shared";

export type AiPreferenceRecord = {
  feature: AiFeature;
  provider: AiProvider;
  model: string;
  updatedAt: Date;
};

export class InvalidAiPreferenceError extends Error {
  readonly code = "INVALID_AI_PREFERENCE";
  constructor(public readonly reason: string) {
    super(reason);
  }
}

function toRecord(row: {
  feature: string;
  provider: string;
  model: string;
  updatedAt: Date;
}): AiPreferenceRecord | null {
  if (!isAiFeature(row.feature)) return null;
  if (!isAiProvider(row.provider)) return null;
  if (!isValidModel(row.provider, row.model)) return null;
  return {
    feature: row.feature,
    provider: row.provider,
    model: row.model,
    updatedAt: row.updatedAt,
  };
}

export async function listAiPreferences(
  userId: string,
): Promise<AiPreferenceRecord[]> {
  const rows = await prisma.userAiPreference.findMany({
    where: { userId },
    select: { feature: true, provider: true, model: true, updatedAt: true },
  });
  return rows.map(toRecord).filter((r): r is AiPreferenceRecord => r !== null);
}

export async function upsertAiPreference(
  userId: string,
  feature: AiFeature,
  provider: AiProvider,
  model: string,
): Promise<AiPreferenceRecord> {
  if (!(AI_FEATURES as readonly string[]).includes(feature)) {
    throw new InvalidAiPreferenceError("Fonctionnalité inconnue.");
  }
  if (!(AI_PROVIDERS as readonly string[]).includes(provider)) {
    throw new InvalidAiPreferenceError("Fournisseur inconnu.");
  }
  if (!isValidModel(provider, model)) {
    throw new InvalidAiPreferenceError(
      `Le modèle "${model}" n'est pas disponible pour ${provider}.`,
    );
  }
  const row = await prisma.userAiPreference.upsert({
    where: { userId_feature: { userId, feature } },
    create: { userId, feature, provider, model },
    update: { provider, model },
    select: { feature: true, provider: true, model: true, updatedAt: true },
  });
  const record = toRecord(row);
  if (!record) throw new InvalidAiPreferenceError("Préférence invalide.");
  return record;
}

export async function resolveFeaturePreference(
  userId: string | null,
  feature: AiFeature,
  fallbackProvider: AiProvider,
): Promise<{ provider: AiProvider; model: string }> {
  if (userId) {
    const row = await prisma.userAiPreference.findUnique({
      where: { userId_feature: { userId, feature } },
      select: { provider: true, model: true },
    });
    if (
      row &&
      isAiProvider(row.provider) &&
      isValidModel(row.provider, row.model)
    ) {
      return { provider: row.provider, model: row.model };
    }
  }
  return { provider: fallbackProvider, model: defaultModelFor(fallbackProvider) };
}
