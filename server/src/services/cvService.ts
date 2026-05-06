import { prisma } from "../lib/prisma";
import { cvDataSchema, type CvData, type TemplateId } from "@cvie/shared";
import {
  SYSTEM_FOLDER_DEFAULT,
  SYSTEM_FOLDER_TRASH,
} from "./folderService";
import type { Cv } from "../../../prisma/generated/prisma/client";

export type CvRow = Cv;

export const MAX_ACTIVE_CVS = 50;
export const MAX_TRASHED_CVS = 50;

type CvErrorCode =
  | "VALIDATION"
  | "LIMIT_EXCEEDED"
  | "CV_NOT_FOUND"
  | "TARGET_FOLDER_NOT_FOUND"
  | "HARD_DELETE_REQUIRES_TRASH";

export class CvError extends Error {
  constructor(public readonly code: CvErrorCode, message: string) {
    super(message);
    this.name = "CvError";
  }
}

export type CreateCvInput = {
  title: string;
  templateId: TemplateId;
  data: unknown;
  folderId?: string;
};

async function getDefaultFolder(userId: string) {
  return prisma.folder.findFirst({
    where: { userId, isSystem: true, name: SYSTEM_FOLDER_DEFAULT },
  });
}

// used in Task 6 (move/hard-delete)
async function getTrashFolder(userId: string) {
  return prisma.folder.findFirst({
    where: { userId, isSystem: true, name: SYSTEM_FOLDER_TRASH },
  });
}

export async function createCv(
  userId: string,
  input: CreateCvInput,
): Promise<CvRow> {
  const default_ = await getDefaultFolder(userId);
  if (!default_) {
    throw new CvError(
      "TARGET_FOLDER_NOT_FOUND",
      "Default folder missing for user — seeding never ran.",
    );
  }

  const active = await prisma.cv.count({
    where: {
      userId,
      OR: [
        { folder: { isSystem: false } },
        { folder: { isSystem: true, ttlDays: null } },
      ],
    },
  });
  if (active >= MAX_ACTIVE_CVS) {
    throw new CvError(
      "LIMIT_EXCEEDED",
      `Active CV limit (${MAX_ACTIVE_CVS}) reached.`,
    );
  }

  const targetFolderId = input.folderId ?? default_.id;

  // On create, accept partial/empty data — the editor hydrates and overwrites
  // via PATCH on first save. Strict schema validation lives in patchCv.
  const parsed = cvDataSchema.safeParse(input.data);
  const stored = parsed.success
    ? (parsed.data as unknown as object)
    : ((input.data ?? {}) as object);

  return prisma.cv.create({
    data: {
      userId,
      folderId: targetFolderId,
      title: input.title,
      templateId: input.templateId,
      data: stored,
    },
  });
}

export async function readCv(userId: string, cvId: string): Promise<CvRow | null> {
  const cv = await prisma.cv.findUnique({ where: { id: cvId } });
  if (!cv || cv.userId !== userId) return null;
  return cv;
}

export async function listActiveCvs(userId: string): Promise<CvRow[]> {
  return prisma.cv.findMany({
    where: {
      userId,
      OR: [
        { folder: { isSystem: false } },
        { folder: { isSystem: true, ttlDays: null } },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listTrashCvs(userId: string): Promise<CvRow[]> {
  return prisma.cv.findMany({
    where: {
      userId,
      folder: { isSystem: true, ttlDays: { not: null } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export type CvPatch = Partial<{
  title: string;
  templateId: TemplateId;
  data: unknown;
}>;

export async function patchCv(
  userId: string,
  cvId: string,
  patch: CvPatch,
): Promise<CvRow> {
  const existing = await prisma.cv.findUnique({ where: { id: cvId } });
  if (!existing || existing.userId !== userId) {
    throw new CvError("CV_NOT_FOUND", "CV not found.");
  }

  const data: Record<string, unknown> = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.templateId !== undefined) data.templateId = patch.templateId;
  if (patch.data !== undefined) {
    const parsed = cvDataSchema.safeParse(patch.data);
    if (!parsed.success) {
      throw new CvError("VALIDATION", "CV data failed schema validation.");
    }
    data.data = parsed.data as unknown as object;
  }

  return prisma.cv.update({
    where: { id: cvId },
    data,
  });
}

export async function moveCv(
  userId: string,
  cvId: string,
  targetFolderId: string,
): Promise<CvRow> {
  const cv = await prisma.cv.findUnique({ where: { id: cvId } });
  if (!cv || cv.userId !== userId) {
    throw new CvError("CV_NOT_FOUND", "CV not found.");
  }

  const targetFolder = await prisma.folder.findFirst({
    where: { id: targetFolderId, userId },
  });
  if (!targetFolder) {
    throw new CvError(
      "TARGET_FOLDER_NOT_FOUND",
      "Target folder not found.",
    );
  }

  // Restore guard: if moving FROM trash to active, enforce active cap.
  const trash = await prisma.folder.findFirst({
    where: { userId, isSystem: true, name: SYSTEM_FOLDER_TRASH },
  });
  const isComingFromTrash = trash !== null && cv.folderId === trash.id;
  const isMovingToActive =
    !targetFolder.isSystem || targetFolder.ttlDays === null;
  if (isComingFromTrash && isMovingToActive) {
    const active = await prisma.cv.count({
      where: {
        userId,
        OR: [
          { folder: { isSystem: false } },
          { folder: { isSystem: true, ttlDays: null } },
        ],
      },
    });
    if (active >= MAX_ACTIVE_CVS) {
      throw new CvError(
        "LIMIT_EXCEEDED",
        "Cannot restore: active CV limit reached.",
      );
    }
  }

  // Move-to-trash: enforce trashed cap.
  const isMovingToTrash =
    targetFolder.isSystem && targetFolder.ttlDays !== null;
  if (isMovingToTrash && !isComingFromTrash) {
    const trashed = await prisma.cv.count({
      where: {
        userId,
        folder: { isSystem: true, ttlDays: { not: null } },
      },
    });
    if (trashed >= MAX_TRASHED_CVS) {
      throw new CvError(
        "LIMIT_EXCEEDED",
        "Trash full. Empty Corbeille before deleting more CVs.",
      );
    }
  }

  return prisma.cv.update({
    where: { id: cvId },
    data: { folderId: targetFolderId },
  });
}

export async function hardDeleteCv(
  userId: string,
  cvId: string,
): Promise<void> {
  const cv = await prisma.cv.findUnique({ where: { id: cvId } });
  if (!cv || cv.userId !== userId) {
    throw new CvError("CV_NOT_FOUND", "CV not found.");
  }

  const trash = await prisma.folder.findFirst({
    where: { userId, isSystem: true, name: SYSTEM_FOLDER_TRASH },
  });
  if (!trash || cv.folderId !== trash.id) {
    throw new CvError(
      "HARD_DELETE_REQUIRES_TRASH",
      "Hard delete requires the CV to be in Corbeille.",
    );
  }

  await prisma.cv.delete({ where: { id: cvId } });
}

export type AnonRecord = {
  id: string;
  title: string;
  templateId: string;
  data: unknown;
  createdAt?: string;
  updatedAt: string;
};

export type ImportSkipped = {
  oldId: string;
  reason: "LIMIT" | "VALIDATION";
};

export type ImportResult = {
  imported: Array<{
    oldId: string;
    newId: string;
    title: string;
    templateId: string;
    updatedAt: Date;
    folderId: string;
  }>;
  skipped: ImportSkipped[];
};

export async function bulkImportCvs(
  userId: string,
  records: AnonRecord[],
): Promise<ImportResult> {
  const default_ = await getDefaultFolder(userId);
  if (!default_) {
    throw new CvError(
      "TARGET_FOLDER_NOT_FOUND",
      "Default folder missing for user — seeding never ran.",
    );
  }

  const active = await prisma.cv.count({
    where: {
      userId,
      OR: [
        { folder: { isSystem: false } },
        { folder: { isSystem: true, ttlDays: null } },
      ],
    },
  });
  const remaining = Math.max(0, MAX_ACTIVE_CVS - active);

  // Sort newest-first; pre-validate everything; then take first `remaining` valid.
  const sorted = [...records].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const validated: Array<{
    record: AnonRecord;
    parsed: unknown;
  }> = [];
  const skipped: ImportSkipped[] = [];

  for (const record of sorted) {
    const parsed = cvDataSchema.safeParse(record.data);
    if (!parsed.success) {
      skipped.push({ oldId: record.id, reason: "VALIDATION" });
      continue;
    }
    validated.push({ record, parsed: parsed.data });
  }

  const toImport = validated.slice(0, remaining);
  const overQuota = validated.slice(remaining);
  for (const { record } of overQuota) {
    skipped.push({ oldId: record.id, reason: "LIMIT" });
  }

  if (toImport.length === 0) {
    return { imported: [], skipped };
  }

  // Create one-by-one to preserve oldId → newId mapping deterministically.
  const created: ImportResult["imported"] = [];
  for (const { record, parsed } of toImport) {
    const row = await prisma.cv.create({
      data: {
        userId,
        folderId: default_.id,
        title: record.title,
        templateId: record.templateId,
        data: parsed as unknown as object,
      },
    });
    created.push({
      oldId: record.id,
      newId: row.id,
      title: row.title,
      templateId: row.templateId,
      updatedAt: row.updatedAt,
      folderId: row.folderId,
    });
  }

  return { imported: created, skipped };
}
