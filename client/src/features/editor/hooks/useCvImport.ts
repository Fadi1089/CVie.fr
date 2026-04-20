import { useState } from "react";
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

  function importPdf(file: File) {
    if (file.type !== "application/pdf") {
      setStatus("error");
      setError("Le fichier doit être un PDF.");
      return;
    }

    setStatus("loading");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    fetch("/api/v1/cv/import", { method: "POST", body: formData })
      .then(async (res) => {
        const body = (await res.json()) as { data?: CvData; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Erreur inconnue");
        if (!body.data) throw new Error("Réponse serveur invalide");
        reset(body.data);
        setStatus("success");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erreur réseau");
        setStatus("error");
      });
  }

  return { status, error, importPdf };
}
