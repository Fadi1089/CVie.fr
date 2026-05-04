import { describe, expect, it, mock, beforeEach } from "bun:test";

const folderFindFirstMock = mock(async (_args: unknown) => null as unknown);
const cvFindUniqueMock = mock(async (_args: unknown) => null as unknown);
const cvFindManyMock = mock(async (_args: unknown) => [] as unknown[]);
const cvCountMock = mock(async (_args: unknown) => 0);
const cvCreateMock = mock(async (args: { data: Record<string, unknown> }) => ({
  id: "cv_new",
  ...args.data,
  createdAt: new Date(),
  updatedAt: new Date(),
}));
const cvUpdateMock = mock(async (args: { where: unknown; data: Record<string, unknown> }) => ({
  id: "cv_1",
  ...args.data,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

mock.module("../../lib/prisma", () => ({
  prisma: {
    folder: { findFirst: folderFindFirstMock },
    cv: {
      findUnique: cvFindUniqueMock,
      findMany: cvFindManyMock,
      count: cvCountMock,
      create: cvCreateMock,
      update: cvUpdateMock,
    },
  },
}));

import {
  createCv,
  readCv,
  listActiveCvs,
  listTrashCvs,
  patchCv,
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
      const call = cvUpdateMock.mock.calls[0]?.[0] as { data: { title: string } };
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
});
