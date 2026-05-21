import { describe, expect, it, mock } from "bun:test";

mock.module("../../lib/prisma", () => ({
  prisma: {
    masterCv: {
      findUnique: mock(async () => null),
      upsert: mock(
        async ({
          where,
          create,
          update,
        }: {
          where: { userId: string };
          create: { data: object };
          update: { data: object };
        }) => ({
          id: "x",
          userId: where.userId,
          data: update.data ?? create.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
    },
  },
}));

import { loadMasterCv, saveMasterCv } from "../masterCvService";
import { masterCvDataSchema } from "@cvie/shared";
import { prisma } from "../../lib/prisma";

describe("masterCvService", () => {
  it("loadMasterCv returns null when none exists", async () => {
    (
      prisma.masterCv.findUnique as ReturnType<typeof mock>
    ).mockResolvedValueOnce(null as never);
    const result = await loadMasterCv("user_1");
    expect(result).toBeNull();
  });

  it("loadMasterCv returns parsed data when row exists", async () => {
    const stored = masterCvDataSchema.parse({
      personalInfo: { firstName: "A", lastName: "B" },
    });
    (
      prisma.masterCv.findUnique as ReturnType<typeof mock>
    ).mockResolvedValueOnce({
      id: "x",
      userId: "user_2",
      data: stored,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    const result = await loadMasterCv("user_2");
    expect(result?.personalInfo.firstName).toBe("A");
  });

  it("saveMasterCv validates and upserts", async () => {
    const data = masterCvDataSchema.parse({
      personalInfo: { firstName: "A", lastName: "B" },
    });
    const saved = await saveMasterCv("user_3", data);
    expect(saved.personalInfo.firstName).toBe("A");
    expect(prisma.masterCv.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_3" } }),
    );
  });

  it("saveMasterCv rejects invalid data", async () => {
    await expect(
      saveMasterCv("user_4", {
        personalInfo: { firstName: "" },
      } as never),
    ).rejects.toThrow();
  });
});
