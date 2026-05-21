import { Hono } from "hono";
import { z } from "zod";
import * as requireAuthModule from "../middleware/requireAuth";
import { loadMasterCv, saveMasterCv } from "../services/masterCvService";
import { masterCvDataSchema } from "@cvie/shared";

export const masterCvRoutes = new Hono();

const MAX_BODY = 512 * 1024;
const bodySchema = z.object({ data: masterCvDataSchema });

masterCvRoutes.use("*", (c, next) =>
  requireAuthModule.requireAuth()(c, next),
);

masterCvRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const data = await loadMasterCv(userId);
  if (!data) return c.json({ code: "not_seeded" }, 404);
  return c.json({ data });
});

masterCvRoutes.put("/", async (c) => {
  const userId = c.get("userId");
  const raw = await c.req.text();
  if (raw.length > MAX_BODY) return c.json({ code: "too_large" }, 413);
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return c.json({ code: "bad_request" }, 400); }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return c.json({ code: "validation_failed" }, 400);
  const saved = await saveMasterCv(userId, parsed.data.data);
  return c.json({ data: saved });
});
