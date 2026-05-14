import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExportPdf } from "../useExportPdf";
import { sampleCvFixture } from "@cvie/shared";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useExportPdf", () => {
  it("POSTs to /api/v1/cv/pdf with {cvData, themeId, atsMode, customization}", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: "application/pdf" }), {
        status: 200,
        headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="cv.pdf"' },
      }),
    );

    const { result } = renderHook(() => useExportPdf());
    await act(async () => {
      await result.current.exportPdf({
        cv: sampleCvFixture,
        themeId: "atelier-classique",
        atsMode: "ats-balanced",
        customization: { accent: "oxblood" },
      });
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("/api/v1/cv/pdf");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      cvData: sampleCvFixture,
      themeId: "atelier-classique",
      atsMode: "ats-balanced",
      customization: { accent: "oxblood" },
    });
  });

  it("surfaces server error codes (INVALID_TEMPLATE, etc.) via the returned error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Le template sélectionné est invalide.", code: "INVALID_TEMPLATE" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useExportPdf());
    await act(async () => {
      const res = await result.current.exportPdf({
        cv: sampleCvFixture,
        themeId: "bogus",
        atsMode: "ats-balanced",
        customization: {},
      });
      expect(res.ok).toBe(false);
      expect(res.ok ? null : res.code).toBe("INVALID_TEMPLATE");
    });
  });

  it("aborts the in-flight request when `abort()` is called", async () => {
    let signal: AbortSignal | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      signal = (init as RequestInit).signal as AbortSignal | undefined;
      return new Promise(() => {}); // never resolves
    });

    const { result } = renderHook(() => useExportPdf());
    act(() => {
      void result.current.exportPdf({
        cv: sampleCvFixture,
        themeId: "atelier-classique",
        atsMode: "ats-balanced",
        customization: {},
      });
    });
    act(() => result.current.abort());
    expect(signal?.aborted).toBe(true);
  });
});
