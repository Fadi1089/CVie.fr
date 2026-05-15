import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { CvData } from "@cvie/shared";

// Mock useFormContext from react-hook-form
const mockReset = vi.fn();
vi.mock("react-hook-form", () => ({
  useFormContext: () => ({ reset: mockReset }),
}));

// Import the hook AFTER mocking
const { useCvImport } = await import("../useCvImport");

// ── helpers ───────────────────────────────────────────────────────────────────

function makePdfFile(name = "cv.pdf"): File {
  return new File(["content"], name, { type: "application/pdf" });
}

function makeNonPdfFile(name = "cv.docx"): File {
  return new File(
    ["content"],
    name,
    { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  );
}

const minimalCvData: CvData = {
  personalInfo: {
    firstName: "Jean",
    lastName: "Dupont",
    email: "jean@example.com",
    phone: "",
    city: "",
    jobTitle: "",
    summary: "",
    linkedinUrl: "",
    portfolioUrl: "",
    photoUrl: "",
    portfolioDisplay: "clickable",
  },
  experiences: [],
  formations: [],
  skills: [],
  languages: [],
  interests: [],
  themeId: "atelier-classique",
  customization: {},
};

// ── tests ─────────────────────────────────────────────────────────────────────

describe("useCvImport", () => {
  beforeEach(() => {
    mockReset.mockClear();
    vi.restoreAllMocks();
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() => useCvImport());
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(typeof result.current.importPdf).toBe("function");
  });

  it("rejects non-PDF file without making a network call, sets status error", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { result } = renderHook(() => useCvImport());

    await act(async () => {
      result.current.importPdf(makeNonPdfFile());
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBeTruthy();
  });

  it("on successful import: calls fetch with FormData, calls form.reset(cvData), sets status success", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: minimalCvData }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useCvImport());

    await act(async () => {
      result.current.importPdf(makePdfFile());
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/cv/import");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);

    expect(mockReset).toHaveBeenCalledOnce();
    expect(mockReset).toHaveBeenCalledWith(minimalCvData);
    expect(result.current.status).toBe("success");
    expect(result.current.error).toBeNull();
  });

  it("on server error: sets status error, sets error message, does NOT call form.reset", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Parsing failed" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useCvImport());

    await act(async () => {
      result.current.importPdf(makePdfFile());
    });

    expect(mockReset).not.toHaveBeenCalled();
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Parsing failed");
  });
});
