import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCvImport } from "../hooks/useCvImport";

const PHASES = [
  {
    label: "LECTURE",
    text: "Extraction du contenu du fichier PDF…",
  },
  {
    label: "TRAITEMENT IA",
    text: "Identification des informations du CV…",
  },
  {
    label: "VALIDATION",
    text: "Structuration et vérification des données…",
  },
] as const;

function DocumentScanIcon() {
  return (
    <div className="relative mx-auto w-12 h-[62px]">
      <svg viewBox="0 0 48 62" fill="none" aria-hidden className="w-full h-full">
        {/* Document body */}
        <rect
          x="1" y="1" width="40" height="54" rx="3"
          fill="var(--color-paper-deep)"
          stroke="var(--color-rule)"
          strokeWidth="1.5"
        />
        {/* Folded corner */}
        <path d="M30 1 L41 12 L30 12 Z" fill="var(--color-rule)" />
        <line x1="30" y1="1" x2="41" y2="12" stroke="var(--color-rule)" strokeWidth="1.5" />
        {/* Text lines */}
        <line x1="6" y1="20" x2="35" y2="20" stroke="var(--color-rule)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="27" x2="30" y2="27" stroke="var(--color-rule)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="34" x2="35" y2="34" stroke="var(--color-rule)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="41" x2="26" y2="41" stroke="var(--color-rule)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="48" x2="35" y2="48" stroke="var(--color-rule)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {/* Scanning beam */}
      <div
        aria-hidden
        className="cv-import-scan-beam absolute left-[1px] right-[1px] h-[2px] rounded-full"
        style={{
          background: "linear-gradient(90deg, transparent 0%, var(--color-gold) 30%, var(--color-gold) 70%, transparent 100%)",
          boxShadow: "0 0 8px 2px var(--color-gold), 0 0 2px 0px rgba(184,153,104,0.6)",
        }}
      />
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden className="mx-auto">
      <circle cx="24" cy="24" r="22" stroke="var(--color-gold)" strokeWidth="1.5" />
      <path
        d="M14 24.5L20.5 31L34 17"
        stroke="var(--color-gold)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="cv-import-check-draw"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden className="mx-auto">
      <circle cx="24" cy="24" r="22" stroke="#c0392b" strokeWidth="1.5" strokeOpacity="0.6" />
      <line x1="24" y1="15" x2="24" y2="28" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="33" r="1.5" fill="#c0392b" />
    </svg>
  );
}

type OverlayStatus = "loading" | "success" | "error";

function AnalysisOverlay({
  status,
  error,
  fileName,
  onCancel,
  onDismiss,
}: {
  status: OverlayStatus;
  error: string | null;
  fileName: string | null;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const [phase, setPhase] = useState(0);
  const [entered, setEntered] = useState(false);

  // Entrance animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Phase cycling — client-side estimate regardless of server timing
  useEffect(() => {
    if (status !== "loading") return;
    const t1 = setTimeout(() => setPhase(1), 3000);
    const t2 = setTimeout(() => setPhase(2), 9000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [status]);

  // Auto-dismiss after success
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(onDismiss, 2200);
    return () => clearTimeout(t);
  }, [status, onDismiss]);

  const truncatedName = fileName && fileName.length > 36
    ? `${fileName.slice(0, 33)}…`
    : fileName;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300",
        entered ? "opacity-100" : "opacity-0",
      )}
      style={{ background: "rgba(10,10,10,0.22)", backdropFilter: "blur(4px)" }}
      aria-live="polite"
      role="status"
    >
      <div
        className={cn(
          "relative w-[360px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-8 shadow-2xl transition-transform duration-300",
          entered ? "translate-y-0" : "translate-y-3",
        )}
      >
        {/* Dot-grid texture on card */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-30"
          style={{
            backgroundImage: "radial-gradient(var(--color-dot) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        <div className="relative">
          {status === "loading" && <DocumentScanIcon />}
          {status === "success" && <CheckIcon />}
          {status === "error" && <WarningIcon />}

          {status === "loading" && (
            <>
              <h2 className="font-display mt-5 text-[20px] font-medium text-[var(--color-ink)]">
                Analyse en cours…
              </h2>
              {truncatedName && (
                <p className="font-mono-caps mb-5 mt-1 text-[9px] text-[var(--color-ink-soft)]">
                  {truncatedName}
                </p>
              )}

              {/* Phase progress bars */}
              <div className="mb-3 flex gap-1.5">
                {PHASES.map((p, i) => (
                  <div
                    key={p.label}
                    className="h-[2px] flex-1 rounded-full transition-colors duration-700"
                    style={{
                      backgroundColor:
                        i <= phase ? "var(--color-gold)" : "var(--color-rule)",
                    }}
                  />
                ))}
              </div>

              {/* Phase text — crossfade between phases */}
              <div className="relative h-9 overflow-hidden">
                {PHASES.map((p, i) => (
                  <div
                    key={p.label}
                    className={cn(
                      "absolute inset-0 transition-all duration-500",
                      i === phase
                        ? "translate-y-0 opacity-100"
                        : i < phase
                          ? "-translate-y-2 opacity-0"
                          : "translate-y-2 opacity-0",
                    )}
                  >
                    <p
                      className="font-mono-caps text-[9px]"
                      style={{ color: "var(--color-gold)" }}
                    >
                      {p.label}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[var(--color-ink-soft)]">
                      {p.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-[11px] text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 motion-reduce:transition-none"
                >
                  Annuler
                </button>
              </div>
            </>
          )}

          {status === "success" && (
            <div className="text-center">
              <h2 className="font-display mt-5 text-[20px] font-medium text-[var(--color-ink)]">
                CV importé
              </h2>
              <p className="mt-1.5 text-[13px] text-[var(--color-ink-soft)]">
                Les champs ont été remplis automatiquement.
              </p>
            </div>
          )}

          {status === "error" && (
            <>
              <h2 className="font-display mt-5 text-[20px] font-medium text-[var(--color-ink)]">
                Échec de l'analyse
              </h2>
              <p className="mt-2 text-[13px] text-[var(--color-ink-soft)]">
                {error ?? "Une erreur inattendue s'est produite."}
              </p>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={onDismiss}
                  className="text-[12px] text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 motion-reduce:transition-none"
                >
                  Fermer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function CvImportButton() {
  const { status, error, fileName, importPdf, cancelImport } = useCvImport();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (status === "loading" || status === "success" || status === "error") {
      setShowOverlay(true);
    }
  }, [status]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    importPdf(file);
  }

  function handleDismiss() {
    setShowOverlay(false);
    cancelImport();
  }

  function handleCancel() {
    cancelImport();
    setShowOverlay(false);
  }

  const overlayStatus: "loading" | "success" | "error" =
    status === "success" ? "success"
    : status === "error" ? "error"
    : "loading";

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
        disabled={status === "loading"}
        aria-busy={status === "loading"}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--color-rule)] px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none",
          "bg-[var(--color-paper)] text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-deep)] hover:text-[var(--color-ink)]",
        )}
        title="Importer un CV existant (PDF)"
      >
        <Upload className="h-3.5 w-3.5" aria-hidden />
        <span>Importer un CV</span>
      </button>

      {showOverlay && createPortal(
        <AnalysisOverlay
          status={overlayStatus}
          error={error}
          fileName={fileName}
          onCancel={handleCancel}
          onDismiss={handleDismiss}
        />,
        document.body,
      )}
    </>
  );
}
