import { useRef, useState } from "react";
import type { CvData } from "@cvie/shared";
import { useAuthApi } from "@/features/auth/hooks/useAuthApi";

export function PdfImportDialog({
  onExtracted,
  onClose,
}: {
  onExtracted: (cv: CvData) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { fetch: authFetch } = useAuthApi();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (file.type !== "application/pdf") {
      setStatus("error");
      setError("Le fichier doit être un PDF.");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await authFetch("/api/v1/cv/import", {
        method: "POST",
        body: form,
      });
      const body = (await res.json()) as { data?: CvData; error?: string };
      if (!res.ok) throw new Error(body.error ?? `import failed: ${res.status}`);
      if (!body.data) throw new Error("Réponse serveur invalide");
      onExtracted(body.data);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erreur réseau");
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Import PDF"
      className="mx-auto mt-20 max-w-md rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-6"
    >
      <h2 className="font-display text-xl">Importer un PDF</h2>
      <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
        Sélectionnez un CV au format PDF pour pré-remplir votre Master CV.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === "loading"}
          className="font-mono-caps rounded-full border border-[var(--color-rule)] px-3 py-2 text-[10px] tracking-[0.18em] text-[var(--color-ink)] hover:border-[var(--color-ink-soft)] disabled:opacity-40"
        >
          CHOISIR UN FICHIER
        </button>
        <span className="truncate text-sm text-[var(--color-ink-soft)]">
          {fileName ?? "Aucun fichier sélectionné"}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={onFile}
          disabled={status === "loading"}
          className="sr-only"
        />
      </div>
      {status === "loading" && (
        <p className="mt-3 text-sm text-[var(--color-ink-soft)]">Analyse en cours…</p>
      )}
      {status === "error" && error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={status === "loading"}
          className="font-mono-caps rounded-full px-4 py-2 text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] disabled:opacity-40"
        >
          ANNULER
        </button>
      </div>
    </div>
  );
}
