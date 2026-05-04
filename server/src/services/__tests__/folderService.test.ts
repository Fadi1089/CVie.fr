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
const transactionMock = mock(async (cb: (tx: unknown) => Promise<unknown>) =>
  cb({
    folder: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      create: createMock,
      createMany: createManyMock,
    },
  }),
);

mock.module("../../lib/prisma", () => ({
  prisma: {
    folder: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      create: createMock,
      createMany: createManyMock,
    },
    $transaction: transactionMock,
  },
}));

import {
  createFolder,
  seedSystemFolders,
  FolderError,
} from "../folderService";

describe("folderService", () => {
  beforeEach(() => {
    findManyMock.mockClear();
    findUniqueMock.mockClear();
    createMock.mockClear();
    createManyMock.mockClear();
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
});
