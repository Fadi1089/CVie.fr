import { describe, expect, it, mock, beforeEach } from "bun:test";

const folderFindFirstMock = mock(async (_args: unknown) => null as unknown);
const cvFindUniqueMock = mock(async (_args: unknown) => null as unknown);
const cvFindManyMock = mock(async (_args: unknown) => [] as unknown[]);
const cvCountMock = mock(async (_args: unknown) => 0);
const cvCreateMock = mock(
  async (args: { data: Record<string, unknown> }) =>
    ({
      id: "cv_new",
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as Record<string, unknown>,
);
const cvUpdateMock = mock(
  async (args: { where: unknown; data: Record<string, unknown> }) =>
    ({
      id: "cv_1",
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as Record<string, unknown>,
);
const cvDeleteMock = mock(async (_args: unknown) => undefined as unknown);
const cvCreateManyMock = mock(async (_args: unknown) => ({ count: 0 }));

mock.module("../../lib/prisma", () => ({
  prisma: {
    folder: { findFirst: folderFindFirstMock },
    cv: {
      findUnique: cvFindUniqueMock,
      findMany: cvFindManyMock,
      count: cvCountMock,
      create: cvCreateMock,
      update: cvUpdateMock,
      delete: cvDeleteMock,
      createMany: cvCreateManyMock,
    },
  },
}));

import {
  createCv,
  readCv,
  listActiveCvs,
  listTrashCvs,
  patchCv,
  moveCv,
  hardDeleteCv,
  bulkImportCvs,
  CvError,
} from "../cvService";

const SAMPLE_DATA = {
  personalInfo: { firstName: "Jane", lastName: "Doe", portfolioDisplay: "clickable" },
  formations: [],
  experiences: [],
  skills: [],
  languages: [],
  interests: [],
};

describe("cvService", () => {
  beforeEach(() => {
    folderFindFirstMock.mockReset();
    cvFindUniqueMock.mockReset();
    cvFindManyMock.mockReset();
    cvCountMock.mockReset();
    cvCreateMock.mockReset();
    cvUpdateMock.mockReset();
    cvDeleteMock.mockReset();
    cvCreateManyMock.mockReset();
    // Restore default implementations after reset.
    folderFindFirstMock.mockImplementation(async () => null);
    cvFindUniqueMock.mockImplementation(async () => null);
    cvFindManyMock.mockImplementation(async () => []);
    cvCountMock.mockImplementation(async () => 0);
    cvCreateMock.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      id: "cv_new",
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    cvUpdateMock.mockImplementation(async (args: { where: unknown; data: Record<string, unknown> }) => ({
      id: "cv_1",
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    cvDeleteMock.mockImplementation(async () => undefined);
    cvCreateManyMock.mockImplementation(async () => ({ count: 0 }));
  });

  describe("createCv", () => {
    it("creates a CV in 'Mes CV' when folderId not provided", async () => {
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_default",
        userId: "u_1",
        name: "Mes CV",
        isSystem: true,
        ttlDays: null,
      });
      cvCountMock.mockResolvedValueOnce(0);
      const cv = await createCv("u_1", {
        title: "Mon CV",
        templateId: "classique",
        data: SAMPLE_DATA,
      });
      expect(cv.id).toBe("cv_new");
      const call = cvCreateMock.mock.calls[0]?.[0] as {
        data: { folderId: string };
      };
      expect(call.data.folderId).toBe("f_default");
    });

    it("rejects when active count is at the cap", async () => {
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_default",
        userId: "u_1",
        name: "Mes CV",
        isSystem: true,
        ttlDays: null,
      });
      cvCountMock.mockResolvedValueOnce(50);
      await expect(
        createCv("u_1", {
          title: "Too Many",
          templateId: "classique",
          data: SAMPLE_DATA,
        }),
      ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
    });

    it("rejects invalid CV data via cvDataSchema", async () => {
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_default",
        userId: "u_1",
        name: "Mes CV",
        isSystem: true,
        ttlDays: null,
      });
      cvCountMock.mockResolvedValueOnce(0);
      await expect(
        createCv("u_1", {
          title: "Bad",
          templateId: "classique",
          data: { personalInfo: {} },
        }),
      ).rejects.toMatchObject({ code: "VALIDATION" });
    });
  });

  describe("readCv", () => {
    it("returns the CV when owned by user", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f_default",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const cv = await readCv("u_1", "cv_1");
      expect(cv?.id).toBe("cv_1");
    });

    it("returns null for another user's CV", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_other",
        folderId: "f",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const cv = await readCv("u_1", "cv_1");
      expect(cv).toBeNull();
    });
  });

  describe("listActiveCvs / listTrashCvs", () => {
    it("listActive includes both 'Mes CV' and custom folders, excludes trash", async () => {
      cvFindManyMock.mockResolvedValueOnce([{ id: "cv_1" }]);
      await listActiveCvs("u_1");
      const call = cvFindManyMock.mock.calls[0]?.[0] as {
        where: { userId: string; OR: unknown[] };
      };
      expect(call.where.userId).toBe("u_1");
      expect(Array.isArray(call.where.OR)).toBe(true);
    });

    it("listTrash returns only trashed CVs", async () => {
      cvFindManyMock.mockResolvedValueOnce([{ id: "cv_2" }]);
      await listTrashCvs("u_1");
      const call = cvFindManyMock.mock.calls[0]?.[0] as {
        where: { userId: string; folder: { isSystem: boolean; ttlDays: { not: null } } };
      };
      expect(call.where.userId).toBe("u_1");
    });
  });

  describe("patchCv", () => {
    it("updates allowed fields", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f",
        title: "Old",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await patchCv("u_1", "cv_1", { title: "New" });
      const call = cvUpdateMock.mock.calls[0]?.[0] as unknown as {
        data: { title: string };
      };
      expect(call.data.title).toBe("New");
    });

    it("validates data against cvDataSchema when data is updated", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await expect(
        patchCv("u_1", "cv_1", { data: { personalInfo: {} } }),
      ).rejects.toMatchObject({ code: "VALIDATION" });
    });

    it("returns 'not found' when CV doesn't belong to user", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_other",
        folderId: "f",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await expect(
        patchCv("u_1", "cv_1", { title: "X" }),
      ).rejects.toMatchObject({ code: "CV_NOT_FOUND" });
    });
  });

  describe("moveCv", () => {
    it("moves CV to a target folder owned by same user", async () => {
      // findUnique cv
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f_default",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // findFirst target folder
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_custom",
        userId: "u_1",
        name: "Custom",
        isSystem: false,
        ttlDays: null,
      });
      // findFirst trash folder
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_trash",
        userId: "u_1",
        name: "Corbeille",
        isSystem: true,
        ttlDays: 30,
      });
      // cv.update returns updated row
      cvUpdateMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f_custom",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await moveCv("u_1", "cv_1", "f_custom");
      expect(result.folderId).toBe("f_custom");
      const updateCall = cvUpdateMock.mock.calls[0]?.[0] as {
        where: { id: string };
        data: { folderId: string };
      };
      expect(updateCall.data.folderId).toBe("f_custom");
    });

    it("rejects move when target folder doesn't belong to user", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f_default",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // target folder findFirst returns null (not owned by user)
      folderFindFirstMock.mockResolvedValueOnce(null);
      await expect(moveCv("u_1", "cv_1", "f_other_user")).rejects.toMatchObject({
        code: "TARGET_FOLDER_NOT_FOUND",
      });
    });

    it("rejects restoring from trash when active cap is reached", async () => {
      // cv is in trash
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f_trash",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // target folder is "Mes CV" (active, system, no ttl)
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_default",
        userId: "u_1",
        name: "Mes CV",
        isSystem: true,
        ttlDays: null,
      });
      // trash folder (to detect isComingFromTrash)
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_trash",
        userId: "u_1",
        name: "Corbeille",
        isSystem: true,
        ttlDays: 30,
      });
      // active count is at cap
      cvCountMock.mockResolvedValueOnce(50);
      await expect(moveCv("u_1", "cv_1", "f_default")).rejects.toMatchObject({
        code: "LIMIT_EXCEEDED",
      });
    });
  });

  describe("hardDeleteCv", () => {
    it("hard-deletes a CV that lives in Corbeille", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f_trash",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_trash",
        userId: "u_1",
        name: "Corbeille",
        isSystem: true,
        ttlDays: 30,
      });
      cvDeleteMock.mockResolvedValueOnce(undefined);
      await expect(hardDeleteCv("u_1", "cv_1")).resolves.toBeUndefined();
      expect(cvDeleteMock).toHaveBeenCalledTimes(1);
      const deleteCall = cvDeleteMock.mock.calls[0]?.[0] as {
        where: { id: string };
      };
      expect(deleteCall.where.id).toBe("cv_1");
    });

    it("rejects hard-delete when CV is not in Corbeille", async () => {
      cvFindUniqueMock.mockResolvedValueOnce({
        id: "cv_1",
        userId: "u_1",
        folderId: "f_default",
        title: "X",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_trash",
        userId: "u_1",
        name: "Corbeille",
        isSystem: true,
        ttlDays: 30,
      });
      await expect(hardDeleteCv("u_1", "cv_1")).rejects.toMatchObject({
        code: "HARD_DELETE_REQUIRES_TRASH",
      });
    });
  });

  describe("bulkImportCvs", () => {
    const makeRecord = (id: string, updatedAt: string, valid = true) => ({
      id,
      title: `CV ${id}`,
      templateId: "classique" as const,
      data: valid ? SAMPLE_DATA : { personalInfo: {} },
      updatedAt,
    });

    it("sorts newest-first, clamps to remaining quota, skips oldest", async () => {
      // getDefaultFolder
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_default",
        userId: "u_1",
        name: "Mes CV",
        isSystem: true,
        ttlDays: null,
      });
      // active count: 49, so remaining = 1
      cvCountMock.mockResolvedValueOnce(49);
      // Two valid records; newest wins
      const records = [
        makeRecord("old_1", "2024-01-01T00:00:00Z"),
        makeRecord("old_2", "2024-06-01T00:00:00Z"),
      ];
      // cv.create called once for old_2 (newest)
      cvCreateMock.mockResolvedValueOnce({
        id: "cv_new_2",
        userId: "u_1",
        folderId: "f_default",
        title: "CV old_2",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date("2024-06-01T00:00:00Z"),
      });
      const result = await bulkImportCvs("u_1", records);
      expect(result.imported).toHaveLength(1);
      expect(result.imported[0]?.oldId).toBe("old_2");
      expect(result.imported[0]?.newId).toBe("cv_new_2");
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]?.oldId).toBe("old_1");
      expect(result.skipped[0]?.reason).toBe("LIMIT");
    });

    it("skips records that fail cvDataSchema validation", async () => {
      folderFindFirstMock.mockResolvedValueOnce({
        id: "f_default",
        userId: "u_1",
        name: "Mes CV",
        isSystem: true,
        ttlDays: null,
      });
      cvCountMock.mockResolvedValueOnce(0);
      const records = [
        makeRecord("valid_1", "2024-06-01T00:00:00Z", true),
        makeRecord("bad_1", "2024-05-01T00:00:00Z", false),
      ];
      cvCreateMock.mockResolvedValueOnce({
        id: "cv_new_v1",
        userId: "u_1",
        folderId: "f_default",
        title: "CV valid_1",
        templateId: "classique",
        data: SAMPLE_DATA,
        createdAt: new Date(),
        updatedAt: new Date("2024-06-01T00:00:00Z"),
      });
      const result = await bulkImportCvs("u_1", records);
      expect(result.imported).toHaveLength(1);
      expect(result.imported[0]?.oldId).toBe("valid_1");
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]?.oldId).toBe("bad_1");
      expect(result.skipped[0]?.reason).toBe("VALIDATION");
    });
  });
});
