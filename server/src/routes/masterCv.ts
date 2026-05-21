import { Hono } from "hono";
import { z } from "zod";
import * as requireAuthModule from "../middleware/requireAuth";
import { loadMasterCv, saveMasterCv, mergeIntoMaster } from "../services/masterCvService";
import { prisma } from "../lib/prisma";
import { masterCvDataSchema, cvDataSchema, createEmptyMaster, type CvData } from "@cvie/shared";

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

const seedBodySchema = z.object({
  sourceCvIds: z.array(z.string().min(1)).max(50),
  pdfExtracted: cvDataSchema.optional(),
});

masterCvRoutes.post("/seed", async (c) => {
  const userId = c.get("userId");
  let json: unknown;
  try { json = await c.req.json(); } catch { return c.json({ code: "bad_request" }, 400); }
  const parsed = seedBodySchema.safeParse(json);
  if (!parsed.success) return c.json({ code: "validation_failed" }, 400);

  const sources = await prisma.cv.findMany({
    where: { id: { in: parsed.data.sourceCvIds }, userId },
    orderBy: { updatedAt: "desc" },
  });

  const cvDatas: CvData[] = sources
    .map((row) => cvDataSchema.safeParse(row.data))
    .filter((r): r is { success: true; data: CvData } => r.success)
    .map((r) => r.data);

  if (parsed.data.pdfExtracted) cvDatas.push(parsed.data.pdfExtracted);

  const existing = await loadMasterCv(userId);
  const seed = existing ?? createEmptyMaster();
  const merged = mergeIntoMaster(seed, cvDatas);
  return c.json({ data: merged });
});
