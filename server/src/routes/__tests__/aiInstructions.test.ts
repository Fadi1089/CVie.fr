import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Hono } from "hono";

const meUserId = "u_1";

const findUniqueMock = mock(
  async (_args: unknown) => null as { text: string } | null,
);
const upsertMock = mock(async (args: { create: { text: string } }) => ({
  text: args.create.text,
}));
mock.module("../../lib/prisma", () => ({
  prisma: {
    userAiInstruction: {
      findUnique: findUniqueMock,
      upsert: upsertMock,
    },
  },
}));

let authMockEnabled = true;
mock.module("../../middleware/requireAuth", () => ({
  requireAuth:
    () =>
    async (
      c: {
        set: (k: string, v: unknown) => void;
        json: (body: unknown, status: number) => unknown;
      },
      next: () => Promise<void>,
    ) => {
      if (!authMockEnabled) {
        return c.json(
          { error: "Authentification requise.", code: "UNAUTHENTICATED" },
          401,
        );
      }
      c.set("userId", meUserId);
      await next();
    },
}));

import { aiInstructionsRoutes } from "../aiInstructions";

function buildApp() {
  const app = new Hono();
  app.route("/api/v1/ai-instructions", aiInstructionsRoutes);
  return app;
}

describe("/api/v1/ai-instructions", () => {
  beforeEach(() => {
    findUniqueMock.mockClear();
    upsertMock.mockClear();
    authMockEnabled = true;
  });

  it("GET returns empty string when never set", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/v1/ai-instructions");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "" });
  });

  it("PUT then GET round-trips the text", async () => {
    const app = buildApp();
    const put = await app.request("/api/v1/ai-instructions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello world" }),
    });
    expect(put.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledTimes(1);

    findUniqueMock.mockResolvedValueOnce({ text: "hello world" });
    const get = await app.request("/api/v1/ai-instructions");
    expect(await get.json()).toEqual({ text: "hello world" });
  });

  it("PUT rejects text longer than 4000 chars", async () => {
    const res = await buildApp().request("/api/v1/ai-instructions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "x".repeat(4001) }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ code: "too_long" });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("requires auth", async () => {
    authMockEnabled = false;
    const res = await buildApp().request("/api/v1/ai-instructions");
    expect(res.status).toBe(401);
  });
});
