import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Hono } from "hono";

const userClaims = { sub: "auth0|u1", email: "u1@example.com" };
const meUserId = "u_1";

const SAMPLE_DATA = {
  personalInfo: { firstName: "Jane", lastName: "Doe", portfolioDisplay: "clickable" },
  formations: [],
  experiences: [],
  skills: [],
  languages: [],
  interests: [],
};

const listActiveMock = mock(async () => [
  { id: "cv_1", userId: meUserId, folderId: "f_default", title: "Mon CV", templateId: "classique", data: SAMPLE_DATA, createdAt: new Date(), updatedAt: new Date() },
]);
const listTrashMock = mock(async () => []);
const readMock = mock(async () => null as unknown);
const createMock = mock(async () => ({
  id: "cv_new",
  userId: meUserId,
  folderId: "f_default",
  title: "X",
  templateId: "classique",
  data: SAMPLE_DATA,
  createdAt: new Date(),
  updatedAt: new Date(),
}));
const patchMock = mock(async () => ({
  id: "cv_1",
  userId: meUserId,
  folderId: "f_default",
  title: "Renamed",
  templateId: "classique",
  data: SAMPLE_DATA,
  createdAt: new Date(),
  updatedAt: new Date(),
}));
const resetMock = mock(async () => ({
  id: "cv_1",
  userId: meUserId,
  folderId: "f_default",
  title: "Mon CV",
  templateId: "classique",
  data: SAMPLE_DATA,
  createdAt: new Date(),
  updatedAt: new Date(),
}));
const moveMock = mock(async () => ({} as unknown));
const hardDeleteMock = mock(async () => undefined);
const bulkImportMock = mock(async () => ({ imported: [], skipped: [] }));

mock.module("../../services/cvService", () => ({
  listActiveCvs: listActiveMock,
  listTrashCvs: listTrashMock,
  readCv: readMock,
  createCv: createMock,
  patchCv: patchMock,
  resetCv: resetMock,
  moveCv: moveMock,
  hardDeleteCv: hardDeleteMock,
  bulkImportCvs: bulkImportMock,
  CvError: class CvError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

mock.module("../../middleware/requireAuth", () => ({
  requireAuth:
    () =>
    async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
      c.set("userClaims", userClaims);
      c.set("userId", meUserId);
      await next();
    },
}));

const generateResumePdfMock = mock(async () => {
  // Minimal valid-looking PDF magic header — route only forwards the bytes.
  return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
});

mock.module("../../services/pdfService", () => ({
  generateResumePdf: generateResumePdfMock,
  pdfFilename: (cv: { personalInfo: { firstName: string; lastName: string } }) =>
    `${cv.personalInfo.firstName.toLowerCase()}-${cv.personalInfo.lastName.toLowerCase()}-cv.pdf`,
}));

import { cvRoutes } from "../cv";

function buildApp() {
  const app = new Hono();
  app.route("/api/v1/cv", cvRoutes);
  return app;
}

describe("cv routes", () => {
  beforeEach(() => {
    listActiveMock.mockClear();
    listTrashMock.mockClear();
    readMock.mockClear();
    createMock.mockClear();
    patchMock.mockClear();
    resetMock.mockClear();
    moveMock.mockClear();
    hardDeleteMock.mockClear();
    bulkImportMock.mockClear();
    generateResumePdfMock.mockClear();
  });

  it("GET /api/v1/cv returns active CVs", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { cvs: unknown[] };
    expect(body.cvs).toHaveLength(1);
  });

  it("GET /api/v1/cv/trash returns trashed", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv/trash");
    expect(res.status).toBe(200);
    expect(listTrashMock).toHaveBeenCalled();
  });

  it("POST /api/v1/cv creates", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "X", templateId: "classique", data: SAMPLE_DATA }),
    });
    expect(res.status).toBe(201);
  });

  it("POST /api/v1/cv/import calls bulkImportCvs", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([
        { id: "old1", title: "X", templateId: "classique", data: SAMPLE_DATA, updatedAt: new Date().toISOString() },
      ]),
    });
    expect(res.status).toBe(200);
    expect(bulkImportMock).toHaveBeenCalled();
  });

  it("PATCH /api/v1/cv/:id updates", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv/cv_1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Renamed" }),
    });
    expect(res.status).toBe(200);
  });

  it("POST /api/v1/cv/:id/reset calls resetCv", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv/cv_1/reset", {
      method: "POST",
    });
    expect(res.status).toBe(200);
    expect(resetMock).toHaveBeenCalledWith(meUserId, "cv_1");
  });

  it("POST /api/v1/cv/:id/move calls moveCv", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv/cv_1/move", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ folderId: "f_target" }),
    });
    expect(res.status).toBe(200);
    expect(moveMock).toHaveBeenCalledWith(meUserId, "cv_1", "f_target");
  });

  it("DELETE /api/v1/cv/:id calls hardDeleteCv", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv/cv_1", { method: "DELETE" });
    expect(res.status).toBe(204);
    expect(hardDeleteMock).toHaveBeenCalledWith(meUserId, "cv_1");
  });

  it("returns 409 LIMIT_EXCEEDED from CvError", async () => {
    createMock.mockImplementationOnce(async () => {
      const { CvError } = await import("../../services/cvService");
      throw new CvError("LIMIT_EXCEEDED", "limit reached");
    });
    const app = buildApp();
    const res = await app.request("/api/v1/cv", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "X", templateId: "classique", data: SAMPLE_DATA }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("LIMIT_EXCEEDED");
  });

  it("POST /api/v1/cv/pdf accepts new {themeId, atsMode, customization} body", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cvData: {
          personalInfo: { firstName: "Jane", lastName: "Doe", portfolioDisplay: "clickable" },
          formations: [],
          experiences: [],
          skills: [],
          languages: [],
          interests: [],
        },
        themeId: "atelier-classique",
        atsMode: "ats-balanced",
        customization: { accent: "encre", density: "comfy", photoShape: "rounded" },
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(generateResumePdfMock).toHaveBeenCalledTimes(1);
    const args = (generateResumePdfMock.mock.calls[0] as unknown as [{ themeId: string; atsMode: string }])[0];
    expect(args.themeId).toBe("atelier-classique");
    expect(args.atsMode).toBe("ats-balanced");
  });

  it("POST /api/v1/cv/pdf rejects invalid customization with INVALID_CUSTOMIZATION", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cvData: {
          personalInfo: { firstName: "Jane", lastName: "Doe", portfolioDisplay: "clickable" },
          formations: [],
          experiences: [],
          skills: [],
          languages: [],
          interests: [],
        },
        themeId: "atelier-classique",
        atsMode: "ats-balanced",
        customization: { accent: "neon-glitch", density: "comfy", photoShape: "rounded" },
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("INVALID_CUSTOMIZATION");
  });

  it("POST /api/v1/cv/pdf rejects unknown themeId with INVALID_TEMPLATE", async () => {
    const app = buildApp();
    const res = await app.request("/api/v1/cv/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cvData: {
          personalInfo: { firstName: "Jane", lastName: "Doe", portfolioDisplay: "clickable" },
          formations: [],
          experiences: [],
          skills: [],
          languages: [],
          interests: [],
        },
        themeId: "ghost-theme",
        atsMode: "ats-balanced",
        customization: {},
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("INVALID_TEMPLATE");
  });
});
