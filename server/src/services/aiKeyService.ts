import { prisma } from "../lib/prisma";
import { encrypt, decrypt, lastFour } from "../lib/byokCrypto";
import {
  validateKey,
  type AiProvider,
} from "@cvie/shared";

export type AiKeyRecord = {
  provider: AiProvider;
  keyHint: string;
  updatedAt: Date;
};

export class InvalidAiKeyError extends Error {
  readonly code = "INVALID_AI_KEY";
  constructor(public readonly reason: string) {
    super(reason);
  }
}

function toRecord(row: {
  provider: string;
  keyHint: string;
  updatedAt: Date;
}): AiKeyRecord {
  return {
    provider: row.provider as AiProvider,
    keyHint: row.keyHint,
    updatedAt: row.updatedAt,
  };
}

export async function listAiKeys(userId: string): Promise<AiKeyRecord[]> {
  const rows = await prisma.userAiKey.findMany({
    where: { userId },
    select: { provider: true, keyHint: true, updatedAt: true },
    orderBy: { provider: "asc" },
  });
  return rows.map(toRecord);
}

export async function upsertAiKey(
  userId: string,
  provider: AiProvider,
  plainKey: string,
): Promise<AiKeyRecord> {
  const validation = validateKey(provider, plainKey);
  if (!validation.ok) {
    throw new InvalidAiKeyError(validation.reason);
  }
  const enc = encrypt(plainKey);
  const hint = lastFour(plainKey);
  const row = await prisma.userAiKey.upsert({
    where: { userId_provider: { userId, provider } },
    create: {
      userId,
      provider,
      ciphertext: new Uint8Array(enc.ciphertext),
      iv: new Uint8Array(enc.iv),
      authTag: new Uint8Array(enc.authTag),
      keyHint: hint,
    },
    update: {
      ciphertext: new Uint8Array(enc.ciphertext),
      iv: new Uint8Array(enc.iv),
      authTag: new Uint8Array(enc.authTag),
      keyHint: hint,
    },
    select: { provider: true, keyHint: true, updatedAt: true },
  });
  return toRecord(row);
}

export async function deleteAiKey(
  userId: string,
  provider: AiProvider,
): Promise<boolean> {
  const result = await prisma.userAiKey.deleteMany({
    where: { userId, provider },
  });
  return result.count > 0;
}

export async function getDecryptedKey(
  userId: string,
  provider: AiProvider,
): Promise<string | null> {
  const row = await prisma.userAiKey.findUnique({
    where: { userId_provider: { userId, provider } },
    select: { ciphertext: true, iv: true, authTag: true },
  });
  if (!row) return null;
  try {
    return decrypt({
      ciphertext: Buffer.from(row.ciphertext),
      iv: Buffer.from(row.iv),
      authTag: Buffer.from(row.authTag),
    });
  } catch (err) {
    console.warn(
      "[aiKeyService] decrypt failed",
      JSON.stringify({ userId, provider, error: (err as Error).message }),
    );
    return null;
  }
}
