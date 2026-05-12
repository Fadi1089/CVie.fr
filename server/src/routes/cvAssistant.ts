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

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 MB decoded
const MAX_ATTACHMENTS_PER_MESSAGE = 3;
const ALLOWED_FILE_MEDIA_PREFIXES = ["image/", "application/pdf"];

type AttachmentValidation =
  | { ok: true }
  | { ok: false; reason: string };

// File parts carry data URLs. Cap count + decoded size + media type so a
// runaway client can't exhaust memory or smuggle arbitrary binaries to the
// upstream provider.
function validateAttachments(
  messages: Array<{ parts: unknown[] }>,
): AttachmentValidation {
  for (const message of messages) {
    let fileCount = 0;
    for (const rawPart of message.parts) {
      if (!rawPart || typeof rawPart !== "object") continue;
      const part = rawPart as { type?: unknown; url?: unknown; mediaType?: unknown };
      if (part.type !== "file") continue;
      fileCount += 1;
      if (fileCount > MAX_ATTACHMENTS_PER_MESSAGE) {
        return { ok: false, reason: `Maximum ${MAX_ATTACHMENTS_PER_MESSAGE} pièce(s) jointe(s) par message.` };
      }
      if (typeof part.mediaType !== "string") {
        return { ok: false, reason: "Pièce jointe sans type MIME." };
      }
      const accepted = ALLOWED_FILE_MEDIA_PREFIXES.some((p) =>
        (part.mediaType as string).startsWith(p),
      );
      if (!accepted) {
        return {
          ok: false,
          reason: `Type de pièce jointe non supporté: ${part.mediaType}.`,
        };
      }
      if (typeof part.url !== "string" || !part.url.startsWith("data:")) {
        return { ok: false, reason: "Pièce jointe doit être encodée en data URL." };
      }
      const commaIdx = part.url.indexOf(",");
      if (commaIdx === -1) {
        return { ok: false, reason: "Pièce jointe invalide." };
      }
      const base64 = part.url.slice(commaIdx + 1);
      // base64 decodes to ceil(n/4)*3 minus padding; rough byte count.
      const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
      const decodedBytes = Math.floor((base64.length * 3) / 4) - padding;
      if (decodedBytes > MAX_ATTACHMENT_BYTES) {
        return {
          ok: false,
          reason: `Pièce jointe trop volumineuse (limite ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} Mo).`,
        };
      }
    }
  }
  return { ok: true };
}

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

  const attachmentCheck = validateAttachments(
    parsed.data.messages as Array<{ parts: unknown[] }>,
  );
  if (!attachmentCheck.ok) {
    return c.json(
      { error: attachmentCheck.reason, code: "ATTACHMENT_REJECTED" },
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
    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        if (part.type === "start") return { provider, model };
        return undefined;
      },
    });
  } catch (err) {
    console.error("[cv/assistant] failed:", err);
    const message = err instanceof Error ? err.message : "Assistant indisponible";
    return c.json({ error: message, code: "ASSISTANT_FAILED" }, 502);
  }
});
