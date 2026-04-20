import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import type { CvData } from "@cvie/shared";

export type ImportStatus = "idle" | "loading" | "success" | "error";

export type UseCvImportReturn = {
  status: ImportStatus;
  error: string | null;
  importPdf: (file: File) => void;
};

export function useCvImport(): UseCvImportReturn {
  const { reset } = useFormContext<CvData>();
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function importPdf(file: File) {
    if (file.type !== "application/pdf") {
      setStatus("error");
      setError("Le fichier doit être un PDF.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    fetch("/api/v1/cv/import", { method: "POST", body: formData, signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json()) as { data?: CvData; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Erreur inconnue");
        if (!body.data) throw new Error("Réponse serveur invalide");
        reset(body.data);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Erreur réseau");
        setStatus("error");
      });
  }

  return { status, error, importPdf };
}
