import { cn } from "@/lib/utils";

export type EditorTabKey = "cv" | "design" | "langue";

const TABS: ReadonlyArray<{ key: EditorTabKey; label: string }> = [
  { key: "cv", label: "CV" },
  { key: "design", label: "Design" },
  { key: "langue", label: "Langue" },
];

export function EditorTabs({
  value,
  onChange,
}: {
  value: EditorTabKey;
  onChange: (next: EditorTabKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Sections de l'éditeur"
      className="mb-4 flex w-full items-center gap-1 rounded-md border border-[var(--color-rule)] bg-white/55 p-1"
    >
      {TABS.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`editor-section-${tab.key}`}
            id={`editor-tab-${tab.key}`}
            onClick={() => onChange(tab.key)}
            className={cn(
              "font-mono-caps relative flex-1 rounded-[4px] px-3 py-2 text-[10px] tracking-[0.14em] transition-colors duration-150 motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30",
              active
                ? "bg-[var(--color-ink)] text-white shadow-[0_1px_0_rgba(10,10,10,0.04)]"
                : "text-[var(--color-ink-soft)] hover:bg-white/70 hover:text-[var(--color-ink)]",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
