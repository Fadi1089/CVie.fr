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

  const parsed = cvDataSchema.safeParse(input.data);
  if (!parsed.success) {
    throw new CvError("VALIDATION", "CV data failed schema validation.");
  }

  const targetFolderId = input.folderId ?? default_.id;

  return prisma.cv.create({
    data: {
      userId,
      folderId: targetFolderId,
      title: input.title,
      templateId: input.templateId,
      data: parsed.data as unknown as object,
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
