import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Hono } from "hono";

const meUserId = "u_master_1";

const loadMasterCvMock = mock(
  async (_userId: string) => null as unknown,
);
const saveMasterCvMock = mock(
  async (_userId: string, data: unknown) => data,
);
mock.module("../../services/masterCvService", () => ({
  loadMasterCv: loadMasterCvMock,
  saveMasterCv: saveMasterCvMock,
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
});
