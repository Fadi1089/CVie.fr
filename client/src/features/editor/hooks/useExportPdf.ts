import { useCallback, useRef } from "react";
import type { CvData, AtsMode } from "@cvie/shared";

export type ExportPdfInput = {
  cv: CvData;
  themeId: string;
  atsMode: AtsMode;
  customization: Record<string, unknown>;
};

export type ExportPdfResult =
  | { ok: true; blob: Blob; filename: string }
  | { ok: false; code: string; message: string; status: number };

function extractFilename(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const match = /filename="?([^"]+)"?/.exec(disposition);
  return match?.[1] ?? fallback;
}

export function useExportPdf() {
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const exportPdf = useCallback(
    async (input: ExportPdfInput): Promise<ExportPdfResult> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch("/api/v1/cv/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvData: input.cv,
          themeId: input.themeId,
          atsMode: input.atsMode,
          customization: input.customization,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          code?: unknown;
          error?: unknown;
        };
        return {
          ok: false,
          status: res.status,
          code: typeof body.code === "string" ? body.code : "UNKNOWN",
          message: typeof body.error === "string" ? body.error : "Erreur inconnue",
        };
      }

      const blob = await res.blob();
      const filename = extractFilename(res.headers.get("Content-Disposition"), "cv.pdf");
      return { ok: true, blob, filename };
    },
    [],
  );

  return { exportPdf, abort };
}
