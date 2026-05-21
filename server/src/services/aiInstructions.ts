import { prisma } from "../lib/prisma";

const HEADER = "INSTRUCTIONS UTILISATEUR:";
const EMPTY = "(aucune)";

export async function buildUserInstructionsBlock(userId: string): Promise<string> {
  const row = await prisma.userAiInstruction.findUnique({ where: { userId } });
  const text = (row?.text ?? "").trim();
  return `${HEADER}\n${text || EMPTY}`;
}
