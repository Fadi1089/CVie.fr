import { Hono } from "hono";
import { z } from "zod";
import * as requireAuthModule from "../middleware/requireAuth";
import { rateLimit } from "../middleware/rateLimit";
import {
  listAiPreferences,
  upsertAiPreference,
  InvalidAiPreferenceError,
} from "../services/aiPreferenceService";
import { AI_PROVIDERS, isAiFeature } from "@cvie/shared";

export const aiPreferenceRoutes = new Hono();

const bodySchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  model: z.string().min(1).max(120),
});

aiPreferenceRoutes.use("*", (c, next) =>
  requireAuthModule.requireAuth()(c, next),
);

const putLimiter = rateLimit({ max: 20, windowMs: 60_000 });

aiPreferenceRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const preferences = await listAiPreferences(userId);
  c.header("Cache-Control", "no-store");
  return c.json({ preferences });
});

aiPreferenceRoutes.put("/:feature", putLimiter, async (c) => {
  const feature = c.req.param("feature");
  if (!isAiFeature(feature)) {
    return c.json({ error: "Fonctionnalité inconnue.", code: "VALIDATION" }, 400);
  }
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Corps invalide.", code: "VALIDATION" }, 400);
  }
  try {
    const preference = await upsertAiPreference(
      userId,
      feature,
      parsed.data.provider,
      parsed.data.model,
    );
    c.header("Cache-Control", "no-store");
    return c.json({ preference });
  } catch (err) {
    if (err instanceof InvalidAiPreferenceError) {
      return c.json({ error: err.reason, code: "VALIDATION" }, 400);
    }
    throw err;
  }
});
