import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Hono } from "hono";

const MOCK_CV = {
  personalInfo: {
    firstName: "Jean", lastName: "Dupont",
    email: "", phone: "", city: "", jobTitle: "", summary: "",
    linkedinUrl: "", portfolioUrl: "", photoUrl: "",
  },
  formations: [], experiences: [], skills: [], languages: [], interests: [],
};

const mockExtractCvFromPdf = mock(
  async (_buf: Buffer, _provider: string, _key: string, _model: string) =>
    MOCK_CV,
);

mock.module("../../services/cvImportService", () => ({
  extractCvFromPdf: mockExtractCvFromPdf,
}));

const getUserIdByAuth0SubMock = mock(async (_sub: string) => null as string | null);
mock.module("../../services/userService", () => ({
  getUserIdByAuth0Sub: getUserIdByAuth0SubMock,
}));

const getDecryptedKeyMock = mock(
  async (_userId: string, _provider: string) => null as string | null,
);
mock.module("../../services/aiKeyService", () => ({
  getDecryptedKey: getDecryptedKeyMock,
}));

const resolveFeaturePreferenceMock = mock(
  async (_userId: string | null, _feature: string, fallback: string) => ({
    provider: fallback,
    model: "claude-haiku-4-5-20251001",
  }),
);
mock.module("../../services/aiPreferenceService", () => ({
  resolveFeaturePreference: resolveFeaturePreferenceMock,
}));

import { cvImportRoutes } from "../cvImport";

const app = new Hono();
app.route("/import", cvImportRoutes);

// Default bytes start with %PDF- magic signature so they pass the magic byte check
const PDF_MAGIC = new TextEncoder().encode("%PDF-1.4 dummy content");

function makePdfForm(bytes: Uint8Array = PDF_MAGIC) {
  const fd = new FormData();
  fd.append("file", new Blob([bytes], { type: "application/pdf" }), "cv.pdf");
  return fd;
}

describe("POST /import", () => {
  beforeEach(() => {
    mockExtractCvFromPdf.mockClear();
    getUserIdByAuth0SubMock.mockClear();
    getDecryptedKeyMock.mockClear();
    resolveFeaturePreferenceMock.mockClear();
    process.env.ANTHROPIC_API_KEY = "sk-test";
    process.env.AI_PROVIDER = "anthropic";
  });

  it("returns 200 with CvData on valid PDF upload", async () => {
    const res = await app.request("/import", { method: "POST", body: makePdfForm() });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: typeof MOCK_CV };
    expect(body.data.personalInfo.firstName).toBe("Jean");
  });

  it("returns 400 when no file provided", async () => {
    const res = await app.request("/import", { method: "POST", body: new FormData() });
    expect(res.status).toBe(400);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("NO_FILE");
  });

  it("returns 400 when file exceeds 5 MB", async () => {
    const res = await app.request("/import", {
      method: "POST",
      body: makePdfForm(new Uint8Array(6 * 1024 * 1024)),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("FILE_TOO_LARGE");
  });

  it("returns 400 when file is not a PDF", async () => {
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array([1])], { type: "image/png" }), "photo.png");
    const res = await app.request("/import", { method: "POST", body: fd });
    expect(res.status).toBe(400);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("INVALID_TYPE");
  });

  it("returns 400 when file has PDF MIME type but wrong magic bytes", async () => {
    // File claims to be PDF (MIME type) but content doesn't start with %PDF-
    const spoofedBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]); // PNG magic bytes
    const res = await app.request("/import", {
      method: "POST",
      body: makePdfForm(spoofedBytes),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("INVALID_TYPE");
  });

  it("returns 503 when no API key is configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const res = await app.request("/import", { method: "POST", body: makePdfForm() });
    expect(res.status).toBe(503);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("uses BYOK key when authed user has one stored", async () => {
    // Simulate authed request: middleware would set userClaims; route fetches userId; resolver finds BYOK row.
    const authedApp = new Hono();
    authedApp.use("*", async (c, next) => {
      c.set("userClaims", { sub: "auth0|u1", email: "u1@example.com" });
      await next();
    });
    authedApp.route("/import", cvImportRoutes);

    getUserIdByAuth0SubMock.mockResolvedValueOnce("u_1");
    getDecryptedKeyMock.mockResolvedValueOnce("sk-ant-user-byok-key");

    const res = await authedApp.request("/import", { method: "POST", body: makePdfForm() });
    expect(res.status).toBe(200);

    expect(getUserIdByAuth0SubMock).toHaveBeenCalledWith("auth0|u1");
    expect(getDecryptedKeyMock).toHaveBeenCalledWith("u_1", "anthropic");
    const callArgs = mockExtractCvFromPdf.mock.calls[0];
    expect(callArgs?.[1]).toBe("anthropic");
    expect(callArgs?.[2]).toBe("sk-ant-user-byok-key");
    expect(callArgs?.[3]).toBe("claude-haiku-4-5-20251001");
  });

  it("returns 422 when extraction fails", async () => {
    mockExtractCvFromPdf.mockImplementationOnce(async () => {
      throw new Error("Aucun texte trouvé");
    });
    const res = await app.request("/import", { method: "POST", body: makePdfForm() });
    expect(res.status).toBe(422);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("EXTRACTION_FAILED");
  });
});
