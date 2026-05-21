import { masterCvDataSchema, type MasterCvData } from "@cvie/shared";
import { prisma } from "../lib/prisma";

export async function loadMasterCv(
  userId: string,
): Promise<MasterCvData | null> {
  const row = await prisma.masterCv.findUnique({ where: { userId } });
  if (!row) return null;
  const parsed = masterCvDataSchema.safeParse(row.data);
  if (!parsed.success) {
    throw new Error(`Stored master CV is invalid for user ${userId}`);
  }
  return parsed.data;
}

export async function saveMasterCv(
  userId: string,
  data: MasterCvData,
): Promise<MasterCvData> {
  const validated = masterCvDataSchema.parse(data);
  await prisma.masterCv.upsert({
    where: { userId },
    create: { userId, data: validated as object },
    update: { data: validated as object },
  });
  return validated;
}
