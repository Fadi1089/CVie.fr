import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Hono } from "hono";

const meUserId = "u_1";

const listAiKeysMock = mock(async (_userId: string) =>
  [] as { provider: string; keyHint: string; updatedAt: Date }[],
);
const upsertAiKeyMock = mock(
  async (_u: string, provider: string, plain: string) => ({
    provider,
    keyHint: plain.slice(-4),
    updatedAt: new Date(),
  }),
);
const deleteAiKeyMock = mock(async (_u: string, _p: string) => true);

class FakeInvalid extends Error {
  readonly code = "INVALID_AI_KEY";
  constructor(public readonly reason: string) {
    super(reason);
  }
}

mock.module("../../services/aiKeyService", () => ({
  listAiKeys: listAiKeysMock,
  upsertAiKey: upsertAiKeyMock,
  deleteAiKey: deleteAiKeyMock,
  InvalidAiKeyError: FakeInvalid,
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
        return c.json({ error: "Authentification requise.", code: "UNAUTHENTICATED" }, 401);
      }
      c.set("userId", meUserId);
      await next();
    },
}));

import { aiKeyRoutes } from "../aiKeys";

function buildApp() {
  const app = new Hono();
  app.route("/api/v1/ai-keys", aiKeyRoutes);
  return app;
}

describe("aiKeys routes", () => {
  beforeEach(() => {
    listAiKeysMock.mockClear();
    upsertAiKeyMock.mockClear();
    deleteAiKeyMock.mockClear();
    authMockEnabled = true;
  });

  it("GET / requires auth", async () => {
    authMockEnabled = false;
    const app = buildApp();
    const res = await app.request("/api/v1/ai-keys");
    expect(res.status).toBe(401);
  });

  it("GET / returns keys (never plaintext / ciphertext / iv)", async () => {
    listAiKeysMock.mockResolvedValueOnce([
      { provider: "anthropic", keyHint: "WXYZ", updatedAt: new Date() },
    ]);
    const app = buildApp();
    const res = await app.request("/api/v1/ai-keys");
    expect(res.status).toBe(200);
    const body = await res.json();
    const text = JSON.stringify(body);
    expect(text).not.toContain("ciphertext");
    expect(text).not.toContain("\"iv\"");
    expect(text).not.toContain("authTag");
    expect(text).not.toContain("sk-ant-");
    expect(body).toEqual({
      keys: [
        {
          provider: "anthropic",
          keyHint: "WXYZ",
          updatedAt: expect.any(String),
        },
      ],
    });
  });

  it("PUT /:provider rejects unknown provider", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/ai-keys/bogus", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: "sk-ant-abcdefghij1234567890" }),
    });
    expect(res.status).toBe(400);
    expect(upsertAiKeyMock).not.toHaveBeenCalled();
  });

  it("PUT /:provider rejects empty body", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/ai-keys/anthropic", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(400);
  });

  it("PUT /:provider surfaces InvalidAiKeyError as 400", async () => {
    upsertAiKeyMock.mockRejectedValueOnce(new FakeInvalid("Doit commencer par sk-ant-"));
    const app = buildApp();
    const res = await app.request("/api/v1/ai-keys/anthropic", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: "wrong-prefix-abcdef1234" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("sk-ant-");
  });

  it("PUT /:provider happy path returns hint only", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/ai-keys/anthropic", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: "sk-ant-abcdefghij1234WXYZ" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { key: { provider: string; keyHint: string } };
    expect(body.key.keyHint).toBe("WXYZ");
    const text = JSON.stringify(body);
    expect(text).not.toContain("sk-ant-abcdefghij");
  });

  it("DELETE /:provider 200 when row removed", async () => {
    deleteAiKeyMock.mockResolvedValueOnce(true);
    const app = buildApp();
    const res = await app.request("/api/v1/ai-keys/anthropic", { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("DELETE /:provider 404 when no row", async () => {
    deleteAiKeyMock.mockResolvedValueOnce(false);
    const app = buildApp();
    const res = await app.request("/api/v1/ai-keys/openai", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
