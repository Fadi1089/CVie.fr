import { Hono } from "hono";
import { z } from "zod";
import * as requireAuthModule from "../middleware/requireAuth";
import {
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  FolderError,
} from "../services/folderService";

export const folderRoutes = new Hono();

const nameSchema = z.object({ name: z.string().min(1).max(64) });
const deleteBodySchema = z.object({ moveCvsTo: z.string().min(1) });

function folderErrorToResponse(err: FolderError) {
  switch (err.code) {
    case "VALIDATION":
      return { status: 400 as const, code: "VALIDATION" };
    case "FOLDER_NAME_CONFLICT":
      return { status: 409 as const, code: "FOLDER_NAME_CONFLICT" };
    case "FOLDER_LIMIT_EXCEEDED":
      return { status: 409 as const, code: "FOLDER_LIMIT_EXCEEDED" };
    case "FOLDER_NOT_FOUND":
      return { status: 404 as const, code: "FOLDER_NOT_FOUND" };
    case "FOLDER_IS_SYSTEM":
      return { status: 403 as const, code: "FOLDER_IS_SYSTEM" };
    case "TARGET_FOLDER_NOT_FOUND":
      return { status: 404 as const, code: "TARGET_FOLDER_NOT_FOUND" };
    default:
      return { status: 500 as const, code: "INTERNAL" };
  }
}

// Lazy wrapper: defers requireAuth() invocation to request time so that
// test-time mock.module() replacements take effect correctly.
folderRoutes.use("*", (c, next) => requireAuthModule.requireAuth()(c, next));

folderRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const folders = await listFolders(userId);
  c.header("Cache-Control", "no-store");
  return c.json({ folders });
});

folderRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));
  const parsed = nameSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Nom invalide.", code: "VALIDATION" }, 400);
  }
  try {
    const folder = await createFolder(userId, parsed.data.name);
    c.header("Cache-Control", "no-store");
    return c.json({ folder }, 201);
  } catch (err) {
    if (err instanceof FolderError) {
      const { status, code } = folderErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});

folderRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = nameSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Nom invalide.", code: "VALIDATION" }, 400);
  }
  try {
    const folder = await renameFolder(userId, id, parsed.data.name);
    c.header("Cache-Control", "no-store");
    return c.json({ folder });
  } catch (err) {
    if (err instanceof FolderError) {
      const { status, code } = folderErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});

folderRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = deleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Champ moveCvsTo requis.", code: "VALIDATION" },
      400,
    );
  }
  try {
    await deleteFolder(userId, id, parsed.data.moveCvsTo);
    return c.body(null, 204);
  } catch (err) {
    if (err instanceof FolderError) {
      const { status, code } = folderErrorToResponse(err);
      return c.json({ error: err.message, code }, status);
    }
    throw err;
  }
});
