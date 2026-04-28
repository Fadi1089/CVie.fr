import { Hono } from "hono";
import { cvDataSchema, localeSchema } from "@cvie/shared";
import { rateLimit } from "../middleware/rateLimit";
import { translateCv } from "../services/cvTranslateService";

const CV_TRANSLATE_RATE_LIMIT_PER_MIN = (() => {
  const raw = process.env.CV_TRANSLATE_RATE_LIMIT_PER_MIN;
  if (!raw) return 5;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
})();

function hasApiKey(): boolean {
  const provider = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export const cvTranslateRoutes = new Hono();

cvTranslateRoutes.use(
  "*",
  rateLimit({ max: CV_TRANSLATE_RATE_LIMIT_PER_MIN, windowMs: 60_000 }),
);

cvTranslateRoutes.post("/", async (c) => {
  if (!hasApiKey()) {
    console.error(
      "[cv/translate] AI API key not set for provider:",
      process.env.AI_PROVIDER ?? "anthropic",
    );
    return c.json(
      { error: "Service de traduction non configuré.", code: "SERVICE_UNAVAILABLE" },
      503,
    );
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Corps de requête invalide.", code: "BAD_REQUEST" }, 400);
  }

  const parsed = cvDataSchema.safeParse((body as { cv?: unknown })?.cv ?? null);
  const targetParsed = localeSchema.safeParse(
    (body as { targetLang?: unknown })?.targetLang,
  );

  if (!parsed.success) {
    return c.json(
      {
        error: "Données CV invalides.",
        code: "INVALID_CV",
        message: parsed.error.issues[0]?.message ?? "Schéma non respecté.",
      },
      400,
    );
  }
  if (!targetParsed.success) {
    return c.json(
      { error: "Langue cible invalide.", code: "INVALID_LOCALE" },
      400,
    );
  }

  try {
    const translated = await translateCv(parsed.data, targetParsed.data);
    return c.json(translated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Traduction échouée";
    console.error("[cv/translate] failed:", err);
    return c.json(
      { error: message, code: "TRANSLATION_FAILED", message },
      502,
    );
  }
});
