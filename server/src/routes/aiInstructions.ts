import { Hono } from "hono";
import { z } from "zod";
import * as requireAuthModule from "../middleware/requireAuth";
import { prisma } from "../lib/prisma";

const bodySchema = z.object({ text: z.string().max(4000) });

export const aiInstructionsRoutes = new Hono();

aiInstructionsRoutes.use("*", (c, next) =>
  requireAuthModule.requireAuth()(c, next),
);

aiInstructionsRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const row = await prisma.userAiInstruction.findUnique({ where: { userId } });
  return c.json({ text: row?.text ?? "" });
});

aiInstructionsRoutes.put("/", async (c) => {
  const userId = c.get("userId");
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ code: "bad_request" }, 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.code === "too_big")) {
      return c.json({ code: "too_long" }, 400);
    }
    return c.json({ code: "validation_failed" }, 400);
  }
  const text = parsed.data.text;
  await prisma.userAiInstruction.upsert({
    where: { userId },
    update: { text },
    create: { userId, text },
  });
  return c.json({ text });
});
