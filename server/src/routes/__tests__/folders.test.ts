import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Hono } from "hono";

const userClaims = {
  sub: "auth0|u1",
  email: "u1@example.com",
};
const meUserId = "u_1";

const listFoldersMock = mock(async (_userId: string) => [
  { id: "f1", userId: meUserId, name: "Mes CV", isSystem: true, ttlDays: null },
  { id: "f2", userId: meUserId, name: "Corbeille", isSystem: true, ttlDays: 30 },
]);
const createFolderMock = mock(async (_userId: string, name: string) => ({
  id: "f3",
  userId: meUserId,
  name,
  isSystem: false,
  ttlDays: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}));
const renameFolderMock = mock(async (_u: string, id: string, name: string) => ({
  id,
  userId: meUserId,
  name,
  isSystem: false,
  ttlDays: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}));
const deleteFolderMock = mock(async (_u: string, _id: string, _to: string) => undefined);

mock.module("../../services/folderService", () => ({
  listFolders: listFoldersMock,
  createFolder: createFolderMock,
  renameFolder: renameFolderMock,
  deleteFolder: deleteFolderMock,
  FolderError: class FolderError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

mock.module("../../middleware/requireAuth", () => ({
  requireAuth:
    () =>
    async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
      c.set("userClaims", userClaims);
      c.set("userId", meUserId);
      await next();
    },
}));

import { folderRoutes } from "../folders";

function buildApp() {
  const app = new Hono();
  app.route("/api/v1/folders", folderRoutes);
  return app;
}

describe("folder routes", () => {
  beforeEach(() => {
    listFoldersMock.mockClear();
    createFolderMock.mockClear();
    renameFolderMock.mockClear();
    deleteFolderMock.mockClear();
  });

  it("GET /api/v1/folders returns user's folders", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/folders");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { folders: unknown[] };
    expect(body.folders).toHaveLength(2);
    expect(listFoldersMock).toHaveBeenCalledWith(meUserId);
  });

  it("POST /api/v1/folders creates a custom folder", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/folders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alternance" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { folder: { name: string } };
    expect(body.folder.name).toBe("Alternance");
  });

  it("POST /api/v1/folders returns 409 on FolderError(FOLDER_NAME_CONFLICT)", async () => {
    createFolderMock.mockImplementationOnce(async () => {
      const { FolderError } = await import("../../services/folderService");
      throw new FolderError("FOLDER_NAME_CONFLICT", "duplicate");
    });
    const app = buildApp();
    const res = await app.request("/api/v1/folders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Mes CV" }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("FOLDER_NAME_CONFLICT");
  });

  it("PATCH /api/v1/folders/:id renames", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/folders/f3", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Renamed" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { folder: { name: string } };
    expect(body.folder.name).toBe("Renamed");
  });

  it("DELETE /api/v1/folders/:id requires moveCvsTo body", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/folders/f3", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ moveCvsTo: "f1" }),
    });
    expect(res.status).toBe(204);
    expect(deleteFolderMock).toHaveBeenCalledWith(meUserId, "f3", "f1");
  });
});
