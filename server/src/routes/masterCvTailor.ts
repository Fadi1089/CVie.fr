import { Hono } from "hono";
import { z } from "zod";
import { resolveProviderKey } from "../services/aiKeyResolver";
import { loadMasterCv } from "../services/masterCvService";
import { startTailor } from "../services/cvTailorService";
import { buildUserInstructionsBlock } from "../services/aiInstructions";
import { rateLimit } from "../middleware/rateLimit";
import * as requireAuthModule from "../middleware/requireAuth";
import { prisma } from "../lib/prisma";

const RATE = Number.parseInt(process.env.AI_TAILOR_RATE_LIMIT_PER_MIN ?? "5", 10) || 5;

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  templateId: z.string().min(1),
  folderId: z.string().optional(),
  jdText: z.string().min(1).max(20_000),
  provider: z.enum(["anthropic", "openai", "google"]),
  model: z.string().min(1),
});

export const masterCvTailorRoutes = new Hono();

masterCvTailorRoutes.use("*", (c, next) => requireAuthModule.requireAuth()(c, next));
masterCvTailorRoutes.use("*", rateLimit({ max: RATE, windowMs: 60_000 }));

masterCvTailorRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const parsed = bodySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ code: "validation_failed" }, 400);

  const master = await loadMasterCv(userId);
  if (!master) return c.json({ code: "no_master_cv" }, 412);

  const userInstructions = await buildUserInstructionsBlock(userId);
  const resolved = await resolveProviderKey(userId, parsed.data.provider);
  if (!resolved) return c.json({ code: "no_api_key" }, 503);

  const abortController = new AbortController();
  c.req.raw.signal.addEventListener("abort", () => abortController.abort());

  const { result, working } = startTailor({
    master,
    jdText: parsed.data.jdText,
    userInstructions,
    templateId: parsed.data.templateId,
    provider: parsed.data.provider,
    apiKey: resolved.key,
    model: parsed.data.model,
    abortSignal: abortController.signal,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        for await (const part of result.fullStream) {
          if (part.type === "tool-result") {
            const r = part.output as { ok?: boolean; summary?: string; error?: string };
            send({ type: "tool", name: part.toolName, result: r });
          }
        }
        if (working.cv.experiences.length || working.cv.skills.length) {
          const cv = await prisma.cv.create({
            data: {
              userId,
              folderId: parsed.data.folderId ?? (await getDefaultFolderId(userId)),
              title: parsed.data.title,
              templateId: parsed.data.templateId,
              data: working.cv as object,
            },
          });
          send({ type: "done", cvId: cv.id, pendingChanges: working.pendingChanges });
        } else {
          send({ type: "error", code: "empty_result" });
        }
        controller.close();
      } catch (err) {
        console.error("[masterCvTailor] stream failed", err);
        send({ type: "error", code: "stream_failed" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

async function getDefaultFolderId(userId: string) {
  const folder = await prisma.folder.findFirst({
    where: { userId, isSystem: true, ttlDays: null },
  });
  if (!folder) throw new Error("default folder missing");
  return folder.id;
}
