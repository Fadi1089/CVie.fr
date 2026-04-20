import { useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useCvImport } from "../hooks/useCvImport";

export function CvImportButton() {
  const { status, error, importPdf } = useCvImport();
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoading = status === "loading";

  useEffect(() => {
    if (status === "success") {
      toast.success("CV importé ! Les champs ont été remplis automatiquement.", {
        id: "cv-import",
      });
    }
    if (status === "error") {
      toast.error(error ?? "Impossible d'analyser ce PDF.", { id: "cv-import" });
    }
  }, [status, error]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    toast.loading("Analyse du CV en cours…", { id: "cv-import" });
    importPdf(file);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Importer un CV PDF"
      />
      <button
        type="button"
        disabled={isLoading}
        aria-busy={isLoading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        title="Importer un CV existant (PDF)"
      >
        {isLoading ? (
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/25 border-t-current"
          />
        ) : (
          <Upload className="h-3.5 w-3.5" aria-hidden />
        )}
        <span>{isLoading ? "Analyse…" : "Importer un CV"}</span>
      </button>
    </>
  );
}
