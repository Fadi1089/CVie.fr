import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import { sampleCv } from "@cvie/shared";

const runAssistantMock = mock(
  async (_args: unknown) => ({
    result: {
      toUIMessageStreamResponse: () =>
        new Response("data: ok\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
    },
    state: { cv: sampleCv },
  }),
);
mock.module("../../services/cvAssistantService", () => ({
  runAssistant: runAssistantMock,
}));

const resolveProviderKeyMock = mock(
  async (_userId: string, _provider: string) =>
    ({ key: "sk-test", source: "env" }) as { key: string; source: "env" | "byok" } | null,
);
mock.module("../../services/aiKeyResolver", () => ({
  resolveProviderKey: resolveProviderKeyMock,
}));

const resolveFeaturePreferenceMock = mock(
  async (_userId: string, _feature: string, fallback: string) => ({
    provider: fallback,
    model: "claude-haiku-4-5-20251001",
  }),
);
mock.module("../../services/aiPreferenceService", () => ({
  resolveFeaturePreference: resolveFeaturePreferenceMock,
}));

const requireAuthMock = mock(
  () => async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("userId", "u_1");
    await next();
  },
);
mock.module("../../middleware/requireAuth", () => ({
  requireAuth: requireAuthMock,
}));

import { cvAssistantRoutes } from "../cvAssistant";

function makeApp() {
  const app = new Hono();
  app.route("/assistant", cvAssistantRoutes);
  return app;
}

function userMessage(text: string) {
  return {
    id: "m_1",
    role: "user" as const,
    parts: [{ type: "text", text }],
  };
}

function filePart(opts: {
  mediaType: string;
  bytes: number;
  url?: string;
}) {
  const base64 = "A".repeat(Math.ceil(opts.bytes * 4 / 3));
  return {
    type: "file",
    mediaType: opts.mediaType,
    url: opts.url ?? `data:${opts.mediaType};base64,${base64}`,
  };
}

describe("POST /assistant/chat", () => {
  beforeEach(() => {
    runAssistantMock.mockClear();
    resolveProviderKeyMock.mockClear();
    resolveFeaturePreferenceMock.mockClear();
    requireAuthMock.mockClear();
    process.env.AI_PROVIDER = "anthropic";
  });

  it("returns 400 on malformed JSON body", async () => {
    const app = makeApp();
    const res = await app.request("/assistant/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("returns 400 when validation fails", async () => {
    const app = makeApp();
    const res = await app.request("/assistant/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cv: sampleCv, messages: [] }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("VALIDATION");
  });

  it("returns 503 when no provider key resolves", async () => {
    resolveProviderKeyMock.mockResolvedValueOnce(null);
    const app = makeApp();
    const res = await app.request("/assistant/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cv: sampleCv, messages: [userMessage("hello")] }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("rejects unsupported attachment media type", async () => {
    const app = makeApp();
    const msg = {
      id: "m_1",
      role: "user" as const,
      parts: [
        { type: "text", text: "hi" },
        filePart({ mediaType: "video/mp4", bytes: 1024 }),
      ],
    };
    const res = await app.request("/assistant/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cv: sampleCv, messages: [msg] }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("ATTACHMENT_REJECTED");
  });

  it("rejects oversize attachment", async () => {
    const app = makeApp();
    const msg = {
      id: "m_1",
      role: "user" as const,
      parts: [
        { type: "text", text: "hi" },
        filePart({ mediaType: "application/pdf", bytes: 9 * 1024 * 1024 }),
      ],
    };
    const res = await app.request("/assistant/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cv: sampleCv, messages: [msg] }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("ATTACHMENT_REJECTED");
  });

  it("rejects more than 3 attachments in one message", async () => {
    const app = makeApp();
    const msg = {
      id: "m_1",
      role: "user" as const,
      parts: [
        { type: "text", text: "hi" },
        filePart({ mediaType: "image/png", bytes: 100 }),
        filePart({ mediaType: "image/png", bytes: 100 }),
        filePart({ mediaType: "image/png", bytes: 100 }),
        filePart({ mediaType: "image/png", bytes: 100 }),
      ],
    };
    const res = await app.request("/assistant/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cv: sampleCv, messages: [msg] }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("ATTACHMENT_REJECTED");
  });

  it("accepts a valid PDF attachment under the size limit", async () => {
    const app = makeApp();
    const msg = {
      id: "m_1",
      role: "user" as const,
      parts: [
        { type: "text", text: "résume ce PDF" },
        filePart({ mediaType: "application/pdf", bytes: 1024 }),
      ],
    };
    const res = await app.request("/assistant/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cv: sampleCv, messages: [msg] }),
    });
    expect(res.status).toBe(200);
  });

  it("invokes runAssistant with resolved provider/model and returns the stream", async () => {
    const app = makeApp();
    const res = await app.request("/assistant/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cv: sampleCv, messages: [userMessage("rewrite bullet 1")] }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(runAssistantMock).toHaveBeenCalledTimes(1);
    const args = runAssistantMock.mock.calls[0]?.[0] as {
      provider: string;
      model: string;
      apiKey: string;
    };
    expect(args.provider).toBe("anthropic");
    expect(args.model).toBe("claude-haiku-4-5-20251001");
    expect(args.apiKey).toBe("sk-test");
  });
});
