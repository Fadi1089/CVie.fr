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

/** Seeds "Mes CV" + "Corbeille" for a new user. Idempotent: caller is
 *  expected to call this exactly once on user creation. */
export async function seedSystemFolders(userId: string): Promise<void> {
  await prisma.folder.createMany({
    data: [
      {
        userId,
        name: SYSTEM_FOLDER_DEFAULT,
        isSystem: true,
        ttlDays: null,
      },
      {
        userId,
        name: SYSTEM_FOLDER_TRASH,
        isSystem: true,
        ttlDays: TRASH_TTL_DAYS,
      },
    ],
  });
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
