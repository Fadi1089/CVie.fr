import { Hono } from "hono";
import { z } from "zod";
import * as requireAuthModule from "../middleware/requireAuth";
import { rateLimit } from "../middleware/rateLimit";
import {
  listAiKeys,
  upsertAiKey,
  deleteAiKey,
  InvalidAiKeyError,
} from "../services/aiKeyService";
import { isAiProvider, AI_KEY_MAX, AI_KEY_MIN } from "@cvie/shared";

export const aiKeyRoutes = new Hono();

const bodySchema = z.object({
  key: z.string().min(AI_KEY_MIN).max(AI_KEY_MAX),
});

aiKeyRoutes.use("*", (c, next) => requireAuthModule.requireAuth()(c, next));

const putLimiter = rateLimit({ max: 10, windowMs: 60_000 });

aiKeyRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const keys = await listAiKeys(userId);
  c.header("Cache-Control", "no-store");
  return c.json({ keys });
});

aiKeyRoutes.put("/:provider", putLimiter, async (c) => {
  const provider = c.req.param("provider");
  if (!isAiProvider(provider)) {
    return c.json({ error: "Fournisseur inconnu.", code: "VALIDATION" }, 400);
  }
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Corps invalide.", code: "VALIDATION" }, 400);
  }
  try {
    const key = await upsertAiKey(userId, provider, parsed.data.key);
    c.header("Cache-Control", "no-store");
    return c.json({ key });
  } catch (err) {
    if (err instanceof InvalidAiKeyError) {
      return c.json({ error: err.reason, code: "VALIDATION" }, 400);
    }
    throw err;
  }
});

aiKeyRoutes.delete("/:provider", async (c) => {
  const provider = c.req.param("provider");
  if (!isAiProvider(provider)) {
    return c.json({ error: "Fournisseur inconnu.", code: "VALIDATION" }, 400);
  }
  const userId = c.get("userId");
  const removed = await deleteAiKey(userId, provider);
  if (!removed) {
    return c.json({ error: "Clé absente.", code: "NOT_FOUND" }, 404);
  }
  return c.json({ ok: true });
});
