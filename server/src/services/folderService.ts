import { prisma } from "../lib/prisma";
import type { Folder } from "../../../prisma/generated/prisma/client";

export type FolderRow = Folder;

export const SYSTEM_FOLDER_DEFAULT = "Mes CV";
export const SYSTEM_FOLDER_TRASH = "Corbeille";
export const TRASH_TTL_DAYS = 30;
export const MAX_CUSTOM_FOLDERS = 20;
export const MAX_FOLDER_NAME_LENGTH = 64;

type FolderErrorCode =
  | "VALIDATION"
  | "FOLDER_NAME_CONFLICT"
  | "FOLDER_LIMIT_EXCEEDED"
  | "FOLDER_NOT_FOUND"
  | "FOLDER_IS_SYSTEM"
  | "TARGET_FOLDER_NOT_FOUND";

export class FolderError extends Error {
  constructor(public readonly code: FolderErrorCode, message: string) {
    super(message);
    this.name = "FolderError";
  }
}

function normalizeName(name: string): string {
  return name.trim();
}

function caseFold(s: string): string {
  return s.trim().toLocaleLowerCase("fr-FR");
}

/** Seeds "Mes CV" + "Corbeille" for a user when missing. Idempotent —
 *  inspects existing system folders and only inserts the ones that aren't
 *  there yet, so this can be called as a self-heal on every list. */
export async function seedSystemFolders(userId: string): Promise<void> {
  const existing = await prisma.folder.findMany({
    where: { userId, isSystem: true },
    select: { name: true },
  });
  const have = new Set(existing.map((f) => f.name));
  const toInsert: Array<{ userId: string; name: string; isSystem: true; ttlDays: number | null }> = [];
  if (!have.has(SYSTEM_FOLDER_DEFAULT)) {
    toInsert.push({ userId, name: SYSTEM_FOLDER_DEFAULT, isSystem: true, ttlDays: null });
  }
  if (!have.has(SYSTEM_FOLDER_TRASH)) {
    toInsert.push({ userId, name: SYSTEM_FOLDER_TRASH, isSystem: true, ttlDays: TRASH_TTL_DAYS });
  }
  if (toInsert.length === 0) return;
  await prisma.folder.createMany({ data: toInsert });
}

export async function createFolder(
  userId: string,
  rawName: string,
): Promise<FolderRow> {
  const name = normalizeName(rawName);
  if (name.length === 0 || name.length > MAX_FOLDER_NAME_LENGTH) {
    throw new FolderError(
      "VALIDATION",
      `Folder name must be between 1 and ${MAX_FOLDER_NAME_LENGTH} characters.`,
    );
  }

  const existing = await prisma.folder.findMany({
    where: { userId, isSystem: false },
    select: { id: true, name: true },
  });

  if (existing.length >= MAX_CUSTOM_FOLDERS) {
    throw new FolderError(
      "FOLDER_LIMIT_EXCEEDED",
      `Cannot create more than ${MAX_CUSTOM_FOLDERS} custom folders.`,
    );
  }

  const folded = caseFold(name);
  if (existing.some((f) => caseFold(f.name) === folded)) {
    throw new FolderError(
      "FOLDER_NAME_CONFLICT",
      "A folder with this name already exists.",
    );
  }

  return (await prisma.folder.create({
    data: { userId, name, isSystem: false, ttlDays: null },
  })) as FolderRow;
}

export async function listFolders(userId: string): Promise<FolderRow[]> {
  // Self-heal: legacy users (created before ticket 2 shipped folder
  // seeding in upsertUserByAuth0Sub) have zero system folders. Seed on
  // first list so the sidebar can never render empty.
  await seedSystemFolders(userId);
  return prisma.folder.findMany({
    where: { userId },
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
  });
}

export async function renameFolder(
  userId: string,
  folderId: string,
  rawName: string,
): Promise<FolderRow> {
  const name = normalizeName(rawName);
  if (name.length === 0 || name.length > MAX_FOLDER_NAME_LENGTH) {
    throw new FolderError(
      "VALIDATION",
      `Folder name must be between 1 and ${MAX_FOLDER_NAME_LENGTH} characters.`,
    );
  }

  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder || folder.userId !== userId) {
    throw new FolderError("FOLDER_NOT_FOUND", "Folder not found.");
  }
  if (folder.isSystem) {
    throw new FolderError(
      "FOLDER_IS_SYSTEM",
      "System folders cannot be renamed.",
    );
  }

  const folded = caseFold(name);
  const peers = await prisma.folder.findMany({
    where: { userId, NOT: { id: folderId } },
    select: { name: true },
  });
  if (peers.some((p) => caseFold(p.name) === folded)) {
    throw new FolderError(
      "FOLDER_NAME_CONFLICT",
      "A folder with this name already exists.",
    );
  }

  return prisma.folder.update({
    where: { id: folderId },
    data: { name },
  });
}

export async function deleteFolder(
  userId: string,
  folderId: string,
  moveCvsTo: string,
): Promise<void> {
  // Pre-flight checks outside the transaction so error codes are stable.
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder || folder.userId !== userId) {
    throw new FolderError("FOLDER_NOT_FOUND", "Folder not found.");
  }
  if (folder.isSystem) {
    throw new FolderError(
      "FOLDER_IS_SYSTEM",
      "System folders cannot be deleted.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const target = await tx.folder.findUnique({ where: { id: moveCvsTo } });
    if (!target || target.userId !== userId) {
      throw new FolderError(
        "TARGET_FOLDER_NOT_FOUND",
        "Target folder not found.",
      );
    }
    await tx.cv.updateMany({
      where: { folderId, userId },
      data: { folderId: moveCvsTo },
    });
    await tx.folder.delete({ where: { id: folderId } });
  });
}
