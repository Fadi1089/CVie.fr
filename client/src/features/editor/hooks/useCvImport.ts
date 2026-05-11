import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import type { AiProvider, CvData } from "@cvie/shared";
import { useAuthApi } from "@/features/auth/hooks/useAuthApi";

export type ImportStatus = "idle" | "loading" | "success" | "error";

export type ImportMeta = {
  source: "byok" | "server";
  provider: AiProvider;
  model: string;
};

export type UseCvImportReturn = {
  status: ImportStatus;
  error: string | null;
  fileName: string | null;
  meta: ImportMeta | null;
  importPdf: (file: File) => void;
  cancelImport: () => void;
};

export function useCvImport(): UseCvImportReturn {
  const { reset } = useFormContext<CvData>();
  const { fetch: authFetch } = useAuthApi();
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [meta, setMeta] = useState<ImportMeta | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function cancelImport() {
    abortRef.current?.abort();
    setStatus("idle");
    setError(null);
    setFileName(null);
    setMeta(null);
  }

  function importPdf(file: File) {
    if (file.type !== "application/pdf") {
      setStatus("error");
      setError("Le fichier doit être un PDF.");
      setFileName(file.name);
      setMeta(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);
    setFileName(file.name);
    setMeta(null);

    const formData = new FormData();
    formData.append("file", file);

    authFetch("/api/v1/cv/import", { method: "POST", body: formData, signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json()) as {
          data?: CvData;
          meta?: ImportMeta;
          error?: string;
        };
        if (!res.ok) throw new Error(body.error ?? "Erreur inconnue");
        if (!body.data) throw new Error("Réponse serveur invalide");
        reset(body.data);
        if (body.meta) setMeta(body.meta);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Erreur réseau");
        setStatus("error");
      });
  }

  return { status, error, fileName, meta, importPdf, cancelImport };
}
