import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import type { MasterCvData } from "@cvie/shared";

const meUserId = "u_master_1";

const loadMasterCvMock = mock(
  async (_userId: string) => null as unknown,
);
const saveMasterCvMock = mock(
  async (_userId: string, data: unknown) => data,
);
const mergeIntoMasterMock = mock(
  (_seed: unknown, _sources: unknown) => ({ personalInfo: { firstName: "Merged", lastName: "Result", portfolioDisplay: "clickable" as const }, summaries: [], experiences: [], formations: [], skills: [], languages: [], interests: [], projects: [], certifications: [] } as MasterCvData),
);
mock.module("../../services/masterCvService", () => ({
  loadMasterCv: loadMasterCvMock,
  saveMasterCv: saveMasterCvMock,
  mergeIntoMaster: mergeIntoMasterMock,
}));

const prismaCvFindManyMock = mock(async () => [] as Array<{ data: unknown; updatedAt: Date; id: string; userId: string }>);
mock.module("../../lib/prisma", () => ({
  prisma: { cv: { findMany: prismaCvFindManyMock } },
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

import { masterCvRoutes } from "../masterCv";

function buildApp() {
  const app = new Hono();
  app.route("/api/v1/master-cv", masterCvRoutes);
  return app;
}

describe("/api/v1/master-cv", () => {
  beforeEach(() => {
    loadMasterCvMock.mockClear();
    saveMasterCvMock.mockClear();
    mergeIntoMasterMock.mockClear();
    prismaCvFindManyMock.mockClear();
    authMockEnabled = true;
  });

  it("GET returns 404 when not seeded", async () => {
    loadMasterCvMock.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/v1/master-cv");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ code: "not_seeded" });
    expect(loadMasterCvMock).toHaveBeenCalledWith(meUserId);
  });

  it("GET returns 200 with data when seeded", async () => {
    loadMasterCvMock.mockResolvedValueOnce({
      personalInfo: { firstName: "A", lastName: "B" },
      summaries: [],
      experiences: [],
      formations: [],
      skills: [],
      languages: [],
      interests: [],
      projects: [],
      certifications: [],
    });
    const res = await buildApp().request("/api/v1/master-cv");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { personalInfo: { firstName: string } };
    };
    expect(body.data.personalInfo.firstName).toBe("A");
  });

  it("requires auth", async () => {
    authMockEnabled = false;
    const res = await buildApp().request("/api/v1/master-cv");
    expect(res.status).toBe(401);
  });

  it("PUT validates body and persists", async () => {
    const inputData = { personalInfo: { firstName: "A", lastName: "B" } };
    const res = await buildApp().request("/api/v1/master-cv", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: inputData }),
    });
    expect(res.status).toBe(200);
    expect(saveMasterCvMock).toHaveBeenCalledWith(
      meUserId,
      expect.objectContaining({
        personalInfo: expect.objectContaining({ firstName: "A", lastName: "B" }),
      }),
    );
    const body = (await res.json()) as { data: { personalInfo: { firstName: string } } };
    expect(body.data.personalInfo.firstName).toBe("A");
  });

  it("PUT rejects body over 512 KB", async () => {
    const huge = "x".repeat(600_000);
    const res = await buildApp().request("/api/v1/master-cv", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { personalInfo: { firstName: "A", lastName: "B" }, notes: huge },
      }),
    });
    expect(res.status).toBe(413);
    expect(saveMasterCvMock).not.toHaveBeenCalled();
  });

  it("PUT rejects invalid schema", async () => {
    const res = await buildApp().request("/api/v1/master-cv", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { personalInfo: { firstName: "" } } }),
    });
    expect(res.status).toBe(400);
    expect(saveMasterCvMock).not.toHaveBeenCalled();
  });

  describe("POST /seed", () => {
    it("200 happy path: prisma returns 1 CV, mergeIntoMaster called, response has {data: ...}", async () => {
      const cvRow = {
        id: "cv_1",
        userId: meUserId,
        updatedAt: new Date(),
        data: {
          personalInfo: { firstName: "A", lastName: "B" },
          experiences: [],
          formations: [],
          skills: [],
          languages: [],
          interests: [],
          themeId: "community-stackoverflow",
          customization: {},
        },
      };
      prismaCvFindManyMock.mockResolvedValueOnce([cvRow]);
      loadMasterCvMock.mockResolvedValueOnce(null);

      const res = await buildApp().request("/api/v1/master-cv/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCvIds: ["cv_1"] }),
      });

      expect(res.status).toBe(200);
      expect(prismaCvFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ["cv_1"] }, userId: meUserId } }),
      );
      expect(mergeIntoMasterMock).toHaveBeenCalledTimes(1);
      const body = (await res.json()) as { data: { personalInfo: { firstName: string } } };
      expect(body.data.personalInfo.firstName).toBe("Merged");
    });

    it("400 on bad JSON body", async () => {
      const res = await buildApp().request("/api/v1/master-cv/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json{{{",
      });
      expect(res.status).toBe(400);
      expect(mergeIntoMasterMock).not.toHaveBeenCalled();
    });

    it("400 on validation failure (sourceCvIds not an array)", async () => {
      const res = await buildApp().request("/api/v1/master-cv/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCvIds: "not-an-array" }),
      });
      expect(res.status).toBe(400);
      expect(mergeIntoMasterMock).not.toHaveBeenCalled();
    });

    it("requires auth", async () => {
      authMockEnabled = false;
      const res = await buildApp().request("/api/v1/master-cv/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCvIds: [] }),
      });
      expect(res.status).toBe(401);
    });
  });
});
