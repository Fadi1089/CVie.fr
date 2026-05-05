import { describe, expect, it, mock, beforeEach } from "bun:test";

const findManyMock = mock(async (_args: unknown) => [] as unknown[]);
const findUniqueMock = mock(async (_args: unknown) => null as unknown);
const createMock = mock(async (args: { data: Record<string, unknown> }) => ({
  id: "f_new",
  ...args.data,
  isSystem: args.data.isSystem ?? false,
  ttlDays: args.data.ttlDays ?? null,
  createdAt: new Date(),
  updatedAt: new Date(),
}));
const createManyMock = mock(async (_args: unknown) => ({ count: 2 }));
const updateMock = mock(async (_args: unknown) => ({} as unknown));
const deleteMock = mock(async (_args: unknown) => ({} as unknown));
const updateManyMock = mock(async (_args: unknown) => ({ count: 0 }));
const transactionMock = mock(async (cb: (tx: unknown) => Promise<unknown>) =>
  cb({
    folder: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      create: createMock,
      createMany: createManyMock,
      update: updateMock,
      delete: deleteMock,
    },
    cv: { updateMany: updateManyMock },
  }),
);

mock.module("../../lib/prisma", () => ({
  prisma: {
    folder: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      create: createMock,
      createMany: createManyMock,
      update: updateMock,
      delete: deleteMock,
    },
    cv: { updateMany: updateManyMock },
    $transaction: transactionMock,
  },
}));

import {
  createFolder,
  seedSystemFolders,
  listFolders,
  renameFolder,
  deleteFolder,
  FolderError,
} from "../folderService";

describe("folderService", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    findManyMock.mockImplementation(async (_args: unknown) => [] as unknown[]);
    findUniqueMock.mockReset();
    findUniqueMock.mockImplementation(async (_args: unknown) => null as unknown);
    createMock.mockReset();
    createMock.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      id: "f_new",
      ...args.data,
      isSystem: args.data.isSystem ?? false,
      ttlDays: args.data.ttlDays ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    createManyMock.mockReset();
    createManyMock.mockImplementation(async (_args: unknown) => ({ count: 2 }));
    updateMock.mockReset();
    updateMock.mockImplementation(async (_args: unknown) => ({} as unknown));
    deleteMock.mockReset();
    deleteMock.mockImplementation(async (_args: unknown) => ({} as unknown));
    updateManyMock.mockReset();
    updateManyMock.mockImplementation(async (_args: unknown) => ({ count: 0 }));
  });

  describe("seedSystemFolders", () => {
    it("creates 'Mes CV' and 'Corbeille' for a new user", async () => {
      await seedSystemFolders("u_1");
      expect(createManyMock).toHaveBeenCalledTimes(1);
      const call = createManyMock.mock.calls[0]?.[0] as {
        data: Array<{ userId: string; name: string; isSystem: boolean; ttlDays: number | null }>;
      };
      expect(call.data).toHaveLength(2);
      expect(call.data[0]).toMatchObject({
        userId: "u_1",
        name: "Mes CV",
        isSystem: true,
        ttlDays: null,
      });
      expect(call.data[1]).toMatchObject({
        userId: "u_1",
        name: "Corbeille",
        isSystem: true,
        ttlDays: 30,
      });
    });
  });

  describe("createFolder", () => {
    it("creates a custom folder when name is unique and quota not full", async () => {
      findManyMock.mockResolvedValueOnce([]);
      findUniqueMock.mockResolvedValueOnce(null);
      const folder = await createFolder("u_1", "Alternance");
      expect(folder.name).toBe("Alternance");
      expect(createMock).toHaveBeenCalledTimes(1);
      const call = createMock.mock.calls[0]?.[0] as {
        data: { userId: string; name: string; isSystem: boolean };
      };
      expect(call.data.userId).toBe("u_1");
      expect(call.data.isSystem).toBe(false);
    });

    it("trims whitespace from folder name", async () => {
      findManyMock.mockResolvedValueOnce([]);
      findUniqueMock.mockResolvedValueOnce(null);
      const folder = await createFolder("u_1", "  Alternance  ");
      expect(folder.name).toBe("Alternance");
    });

    it("rejects empty names", async () => {
      await expect(createFolder("u_1", "   ")).rejects.toMatchObject({
        code: "VALIDATION",
      });
    });

    it("rejects names longer than 64 characters", async () => {
      await expect(createFolder("u_1", "x".repeat(65))).rejects.toMatchObject({
        code: "VALIDATION",
      });
    });

    it("rejects case-folded duplicates", async () => {
      findManyMock.mockResolvedValueOnce([{ id: "f_1", name: "alternance" }]);
      await expect(createFolder("u_1", "Alternance")).rejects.toMatchObject({
        code: "FOLDER_NAME_CONFLICT",
      });
    });

    it("rejects creation past 20 custom folders", async () => {
      findManyMock.mockResolvedValueOnce(
        Array.from({ length: 20 }, (_, i) => ({ id: `f_${i}`, name: `n${i}` })),
      );
      await expect(createFolder("u_1", "Twenty-first")).rejects.toMatchObject({
        code: "FOLDER_LIMIT_EXCEEDED",
      });
    });
  });

  describe("listFolders", () => {
    it("returns all folders for a user", async () => {
      // First findMany: self-heal seed check (returns existing system folders).
      findManyMock.mockResolvedValueOnce([
        { name: "Mes CV" },
        { name: "Corbeille" },
      ]);
      // Second findMany: the actual list query.
      findManyMock.mockResolvedValueOnce([
        { id: "f_sys", name: "Mes CV", isSystem: true, ttlDays: null },
        { id: "f_trash", name: "Corbeille", isSystem: true, ttlDays: 30 },
        { id: "f_user", name: "Alternance", isSystem: false, ttlDays: null },
      ]);
      const folders = await listFolders("u_1");
      expect(folders).toHaveLength(3);
    });

    it("self-heals: seeds system folders when missing, then lists", async () => {
      // First findMany: self-heal sees no system folders.
      findManyMock.mockResolvedValueOnce([]);
      // Then list returns the freshly-seeded folders.
      findManyMock.mockResolvedValueOnce([
        { id: "f_sys", name: "Mes CV", isSystem: true, ttlDays: null },
        { id: "f_trash", name: "Corbeille", isSystem: true, ttlDays: 30 },
      ]);
      const folders = await listFolders("u_1");
      expect(createManyMock).toHaveBeenCalledTimes(1);
      expect(folders).toHaveLength(2);
    });
  });

  describe("renameFolder", () => {
    it("renames a custom folder when name is unique", async () => {
      findUniqueMock.mockResolvedValueOnce({
        id: "f_user",
        userId: "u_1",
        name: "Old",
        isSystem: false,
        ttlDays: null,
      });
      findManyMock.mockResolvedValueOnce([]);
      updateMock.mockResolvedValueOnce({
        id: "f_user",
        userId: "u_1",
        name: "New",
        isSystem: false,
        ttlDays: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const folder = await renameFolder("u_1", "f_user", "New");
      expect(folder.name).toBe("New");
    });

    it("throws when folder is system-owned", async () => {
      findUniqueMock.mockResolvedValueOnce({
        id: "f_sys",
        userId: "u_1",
        name: "Mes CV",
        isSystem: true,
        ttlDays: null,
      });
      await expect(renameFolder("u_1", "f_sys", "Foo")).rejects.toMatchObject({
        code: "FOLDER_IS_SYSTEM",
      });
    });

    it("throws when folder belongs to another user", async () => {
      findUniqueMock.mockResolvedValueOnce({
        id: "f_user",
        userId: "u_other",
        name: "X",
        isSystem: false,
        ttlDays: null,
      });
      await expect(renameFolder("u_1", "f_user", "Y")).rejects.toMatchObject({
        code: "FOLDER_NOT_FOUND",
      });
    });
  });

  describe("deleteFolder", () => {
    it("reassigns CVs and deletes folder in a transaction", async () => {
      // Pre-flight findUnique: returns the folder to delete (non-system)
      findUniqueMock.mockResolvedValueOnce({
        id: "f_user",
        userId: "u_1",
        name: "Old",
        isSystem: false,
        ttlDays: null,
      });
      // Transaction findUnique: returns the target folder
      findUniqueMock.mockResolvedValueOnce({
        id: "f_target",
        userId: "u_1",
        name: "Target",
        isSystem: false,
        ttlDays: null,
      });
      await deleteFolder("u_1", "f_user", "f_target");
      expect(updateManyMock).toHaveBeenCalledTimes(1);
      expect(deleteMock).toHaveBeenCalledTimes(1);
    });

    it("rejects deletion of system folder", async () => {
      findUniqueMock.mockResolvedValueOnce({
        id: "f_trash",
        userId: "u_1",
        name: "Corbeille",
        isSystem: true,
        ttlDays: 30,
      });
      await expect(
        deleteFolder("u_1", "f_trash", "f_target"),
      ).rejects.toMatchObject({ code: "FOLDER_IS_SYSTEM" });
    });
  });
});
