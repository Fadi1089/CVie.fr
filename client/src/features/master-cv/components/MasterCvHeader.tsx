type Status = "idle" | "saving" | "saved" | "offline" | "error";

export function MasterCvHeader({
  status,
  onImportFromCvs,
  onImportPdf,
}: {
  status: Status;
  onImportFromCvs: () => void;
  onImportPdf: () => void;
}) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--color-rule)] pb-4">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Mon Master CV</h1>
        <p className="text-xs text-[var(--color-ink-soft)]">
          Une seule source pour toutes vos candidatures.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onImportFromCvs}
          className="text-xs underline"
        >
          Importer depuis un CV
        </button>
        <button
          type="button"
          onClick={onImportPdf}
          className="text-xs underline"
        >
          Importer un PDF
        </button>
        <span className="text-xs text-[var(--color-ink-soft)]">
          {status === "saving"
            ? "Enregistrement…"
            : status === "offline"
              ? "Hors-ligne"
              : status === "error"
                ? "Échec d'enregistrement"
                : "Enregistré"}
        </span>
      </div>
    </header>
  );
}
