import { cn } from "@/lib/utils";

export type EditorTab = "edit" | "preview";

type Props = {
  active: EditorTab;
  onChange: (next: EditorTab) => void;
};

const TABS: { id: EditorTab; label: string; disabled?: boolean }[] = [
  { id: "edit", label: "Édition" },
  { id: "preview", label: "Aperçu" },
];

export function MobileTabBar({ active, onChange }: Props) {
  return (
    <nav
      role="tablist"
      aria-label="Éditeur CV"
      className="fixed right-0 bottom-0 left-0 z-40 flex border-t border-[var(--color-rule)] bg-[var(--color-paper)] pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`editor-panel-${tab.id}`}
            id={`editor-tab-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ink)]/30 motion-reduce:transition-none",
              selected
                ? "text-[var(--color-ink)]"
                : "text-[var(--color-ink-soft)]",
              tab.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span>{tab.label}</span>
            {selected ? (
              <span
                aria-hidden="true"
                className="h-0.5 w-8 rounded-full bg-[var(--color-ink)]"
              />
            ) : (
              <span aria-hidden="true" className="h-0.5 w-8" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
