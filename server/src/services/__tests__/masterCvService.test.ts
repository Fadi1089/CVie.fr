import { describe, expect, it, mock } from "bun:test";
import type { CvData } from "@cvie/shared";

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

import { loadMasterCv, saveMasterCv, mergeIntoMaster } from "../masterCvService";
import { masterCvDataSchema, createEmptyMaster } from "@cvie/shared";
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

const baseCvSource = (overrides: Partial<CvData> = {}): CvData => ({
  personalInfo: { firstName: "A", lastName: "B", portfolioDisplay: "clickable" },
  experiences: [],
  formations: [],
  skills: [],
  languages: [],
  interests: [],
  themeId: "x",
  customization: {},
  ...overrides,
});

it("mergeIntoMaster dedupes experiences by (company, startDate, jobTitle)", () => {
  const empty = createEmptyMaster();
  const merged = mergeIntoMaster(empty, [
    baseCvSource({
      experiences: [
        { id: "e1", jobTitle: "Dev", company: "Acme", startDate: "2020-01", endDate: "2021-01", bullets: ["short"] },
      ],
    }),
    baseCvSource({
      experiences: [
        { id: "e2", jobTitle: "Dev", company: "ACME ", startDate: "2020-01", endDate: "2022-01", bullets: ["much longer description winning"], description: "long" },
      ],
    }),
  ]);
  expect(merged.experiences).toHaveLength(1);
  expect(merged.experiences[0]!.achievements).toContain("short");
  expect(merged.experiences[0]!.endDate).toBe("2022-01");
});

it("mergeIntoMaster unions tags across collisions", () => {
  const seed = createEmptyMaster();
  seed.experiences = [{
    id: "mexp_a", jobTitle: "Dev", company: "Acme", startDate: "2020-01", endDate: "2021-01",
    bullets: [], achievements: [], tags: ["backend"],
  }];
  const merged = mergeIntoMaster(seed, [
    baseCvSource({
      experiences: [{ id: "e", jobTitle: "Dev", company: "Acme", startDate: "2020-01", bullets: [] }],
    }),
  ]);
  expect(merged.experiences[0]!.tags).toEqual(["backend"]);
});

it("mergeIntoMaster appends loser's bullets into winner's achievements", () => {
  const empty = createEmptyMaster();
  const merged = mergeIntoMaster(empty, [
    baseCvSource({
      experiences: [
        { id: "e1", jobTitle: "Dev", company: "Acme", startDate: "2020-01", endDate: "2021-01", bullets: ["a", "b"], description: "long enough to win" },
      ],
    }),
    baseCvSource({
      experiences: [
        { id: "e2", jobTitle: "Dev", company: "Acme", startDate: "2020-01", bullets: ["c"] },
      ],
    }),
  ]);
  expect(merged.experiences[0]!.achievements).toEqual(expect.arrayContaining(["a", "b", "c"]));
});
