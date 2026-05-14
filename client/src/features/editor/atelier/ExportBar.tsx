import type { ThemeMeta, AtsMode } from "@cvie/shared";

const MODES: { id: AtsMode; label: string }[] = [
  { id: "ats-strict", label: "ATS strict" },
  { id: "ats-balanced", label: "ATS équilibré" },
  { id: "expressive", label: "Expressif" },
];

type Props = {
  themes: readonly ThemeMeta[];
  activeThemeId: string;
  atsMode: AtsMode;
  onThemeChange: (id: string) => void;
  onAtsModeChange: (mode: AtsMode) => void;
  onExport: () => void;
  exporting: boolean;
};

export function ExportBar({
  themes,
  activeThemeId,
  atsMode,
  onThemeChange,
  onAtsModeChange,
  onExport,
  exporting,
}: Props) {
  return (
    <div className="flex flex-col gap-4 px-6 py-5 border-b border-[var(--atelier-rule)]/30 bg-[var(--atelier-paper)]/50">
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Thème">
        {themes.map((t) => {
          const active = t.id === activeThemeId;
          return (
            <button
              key={t.id}
              role="radio"
              aria-checked={active}
              type="button"
              onClick={() => onThemeChange(t.id)}
              className={`relative inline-flex items-center gap-2 px-3 py-1.5 text-[12px] border transition-colors ${
                active
                  ? "border-[var(--atelier-accent)] text-[var(--atelier-ink)]"
                  : "border-[var(--atelier-rule)]/30 text-[var(--atelier-muted)] hover:text-[var(--atelier-ink)]"
              }`}
              style={{ fontFamily: "var(--atelier-display)" }}
            >
              {t.name}
              {t.tier === "premium" && (
                <span data-testid={`premium-lock-${t.id}`} aria-label="Premium">◇</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div
          role="radiogroup"
          aria-label="Mode d'export"
          className="inline-flex border border-[var(--atelier-rule)]/30"
        >
          {MODES.map((m) => {
            const active = m.id === atsMode;
            return (
              <button
                key={m.id}
                role="radio"
                aria-checked={active}
                type="button"
                onClick={() => onAtsModeChange(m.id)}
                className={`px-3 py-1.5 text-[11px] tracking-[0.16em] transition-colors ${
                  active
                    ? "bg-[var(--atelier-ink)] text-[var(--atelier-paper)]"
                    : "text-[var(--atelier-muted)] hover:text-[var(--atelier-ink)]"
                }`}
                style={{ fontVariant: "small-caps", fontFamily: "var(--atelier-body)" }}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Exporter PDF"
          onClick={onExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-5 py-2 text-[12px] uppercase tracking-[0.18em] text-[var(--atelier-paper)] bg-[var(--atelier-accent)] disabled:opacity-50 transition-opacity"
          style={{ fontFamily: "var(--atelier-body)" }}
        >
          <span aria-hidden>◆</span>
          {exporting ? "Export…" : "Exporter PDF"}
        </button>
      </div>
    </div>
  );
}
