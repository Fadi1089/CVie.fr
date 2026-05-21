import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { buildUserInstructionsBlock } from "../aiInstructions";
import { prisma } from "../../lib/prisma";

describe("buildUserInstructionsBlock", () => {
  let originalFn: typeof prisma.userAiInstruction.findUnique;
  beforeEach(() => {
    originalFn = prisma.userAiInstruction.findUnique;
  });
  afterEach(() => {
    (prisma.userAiInstruction.findUnique as unknown) = originalFn;
  });

  it("returns the fixed header with (aucune) when no row exists", async () => {
    prisma.userAiInstruction.findUnique = mock(async () => null) as never;
    const result = await buildUserInstructionsBlock("user_1");
    expect(result).toBe("INSTRUCTIONS UTILISATEUR:\n(aucune)");
  });

  it("returns the user text verbatim when present", async () => {
    prisma.userAiInstruction.findUnique = mock(async () => ({
      id: "x", userId: "user_1", text: "écris en français formel",
      createdAt: new Date(), updatedAt: new Date(),
    })) as never;
    const result = await buildUserInstructionsBlock("user_1");
    expect(result).toBe("INSTRUCTIONS UTILISATEUR:\nécris en français formel");
  });

  it("treats whitespace-only text as (aucune)", async () => {
    prisma.userAiInstruction.findUnique = mock(async () => ({
      id: "x", userId: "user_1", text: "   \n  ",
      createdAt: new Date(), updatedAt: new Date(),
    })) as never;
    const result = await buildUserInstructionsBlock("user_1");
    expect(result).toBe("INSTRUCTIONS UTILISATEUR:\n(aucune)");
  });
});
