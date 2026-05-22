import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Hono } from "hono";

const meUserId = "u_tailor_1";

const loadMasterCvMock = mock(async (_userId: string) => null as unknown);
mock.module("../../services/masterCvService", () => ({
  loadMasterCv: loadMasterCvMock,
}));

const resolveProviderKeyMock = mock(
  async (_userId: string | null, _provider: string) => null as unknown,
);
mock.module("../../services/aiKeyResolver", () => ({
  resolveProviderKey: resolveProviderKeyMock,
}));

const startTailorMock = mock((_args: unknown) => ({
  result: { fullStream: (async function* () {})() },
  working: {
    cv: {
      personalInfo: { firstName: "", lastName: "", portfolioDisplay: "clickable" as const },
      experiences: [], formations: [], skills: [], languages: [], interests: [],
      themeId: "x",
      customization: {},
    },
    pendingChanges: [],
  },
}));
mock.module("../../services/cvTailorService", () => ({
  startTailor: startTailorMock,
}));

const buildUserInstructionsBlockMock = mock(async (_userId: string) => "");
mock.module("../../services/aiInstructions", () => ({
  buildUserInstructionsBlock: buildUserInstructionsBlockMock,
}));

const prismaFolderFindFirstMock = mock(async () => null as unknown);
const prismaCvCreateMock = mock(async ({ data }: { data: { id?: string } }) => ({ id: "cv_x", ...data }));
mock.module("../../lib/prisma", () => ({
  prisma: {
    folder: { findFirst: prismaFolderFindFirstMock },
    cv: { create: prismaCvCreateMock },
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

import { masterCvTailorRoutes } from "../masterCvTailor";

function buildApp() {
  const app = new Hono();
  app.route("/api/v1/master-cv/tailor", masterCvTailorRoutes);
  return app;
}

describe("/api/v1/master-cv/tailor", () => {
  beforeEach(() => {
    loadMasterCvMock.mockClear();
    resolveProviderKeyMock.mockClear();
    startTailorMock.mockClear();
    buildUserInstructionsBlockMock.mockClear();
    prismaFolderFindFirstMock.mockClear();
    prismaCvCreateMock.mockClear();
    authMockEnabled = true;
  });

  it("rejects when no master CV exists", async () => {
    loadMasterCvMock.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/v1/master-cv/tailor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test",
        templateId: "community-stackoverflow",
        jdText: "JD",
        provider: "anthropic",
        model: "claude-sonnet-4-6",
      }),
    });
    expect(res.status).toBe(412);
    expect(await res.json()).toEqual({ code: "no_master_cv" });
  });

  it("requires auth", async () => {
    authMockEnabled = false;
    const res = await buildApp().request("/api/v1/master-cv/tailor", {
      method: "POST",
    });
    expect(res.status).toBe(401);
  });
});
