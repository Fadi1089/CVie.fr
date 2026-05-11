import { Hono } from "hono";
import { z } from "zod";
import { cvDataSchema, type AiProvider } from "@cvie/shared";
import * as requireAuthModule from "../middleware/requireAuth";
import { rateLimit } from "../middleware/rateLimit";
import { runAssistant } from "../services/cvAssistantService";
import { resolveProviderKey } from "../services/aiKeyResolver";
import { resolveFeaturePreference } from "../services/aiPreferenceService";

const RATE_LIMIT_PER_MIN = (() => {
  const raw = process.env.CV_ASSISTANT_RATE_LIMIT_PER_MIN;
  if (!raw) return 10;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
})();

function envProvider(): AiProvider {
  const raw = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (raw === "openai") return "openai";
  if (raw === "google") return "google";
  return "anthropic";
}

// UIMessage shape from `ai` is broad — we validate the minimum we need
// (role + parts array with at least text). The SDK's `convertToModelMessages`
// downstream does the rest.
const uiMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["system", "user", "assistant"]),
  parts: z.array(z.unknown()).min(1),
});

const bodySchema = z.object({
  cv: cvDataSchema,
  messages: z.array(uiMessageSchema).min(1).max(60),
});

export const cvAssistantRoutes = new Hono();

cvAssistantRoutes.use("*", (c, next) => requireAuthModule.requireAuth()(c, next));
cvAssistantRoutes.use(
  "*",
  rateLimit({ max: RATE_LIMIT_PER_MIN, windowMs: 60_000 }),
);

cvAssistantRoutes.post("/chat", async (c) => {
  const userId = c.get("userId");
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Corps de requête invalide.", code: "BAD_REQUEST" }, 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: "Données invalides.",
        code: "VALIDATION",
        message: parsed.error.issues[0]?.message ?? "Schéma non respecté.",
      },
      400,
    );
  }

  const { provider, model } = await resolveFeaturePreference(
    userId,
    "cvAssistant",
    envProvider(),
  );
  const resolved = await resolveProviderKey(userId, provider);
  if (!resolved) {
    return c.json(
      { error: "Service IA non configuré.", code: "SERVICE_UNAVAILABLE" },
      503,
    );
  }

  try {
    const { result } = await runAssistant({
      cv: parsed.data.cv,
      // `parts` is `unknown[]` here for safety; the SDK accepts the broad
      // shape and only inspects fields it knows about.
      messages: parsed.data.messages as never,
      provider,
      apiKey: resolved.key,
      model,
    });
    console.info(
      "[cv/assistant] start",
      JSON.stringify({ userId, source: resolved.source, provider, model }),
    );
    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[cv/assistant] failed:", err);
    const message = err instanceof Error ? err.message : "Assistant indisponible";
    return c.json({ error: message, code: "ASSISTANT_FAILED" }, 502);
  }
});
