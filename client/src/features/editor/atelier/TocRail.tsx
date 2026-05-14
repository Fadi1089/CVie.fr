import { StampSaved } from "./StampSaved";

export type SectionId =
  | "personal"
  | "formations"
  | "experiences"
  | "skills"
  | "languages"
  | "interests";

type Section = { id: SectionId; label: string };

type Props = {
  sections: Section[];
  active: SectionId;
  savedSection?: SectionId | null;
  onSelect: (id: SectionId) => void;
};

export function TocRail({ sections, active, savedSection, onSelect }: Props) {
  return (
    <nav
      aria-label="Plan du CV"
      className="w-[240px] h-full flex flex-col gap-1 px-6 py-8 border-r border-[var(--atelier-rule)]/30"
      style={{ fontFamily: "var(--atelier-body)" }}
    >
      <p
        className="mb-6 tracking-[0.24em] text-[10px] uppercase text-[var(--atelier-muted)]"
        style={{ fontVariant: "small-caps" }}
      >
        Atelier — Plan
      </p>
      {sections.map((s, i) => {
        const isActive = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            aria-current={isActive || undefined}
            onClick={() => onSelect(s.id)}
            className={`group relative flex items-baseline gap-3 py-2 pr-3 text-left transition-colors ${
              isActive ? "text-[var(--atelier-ink)]" : "text-[var(--atelier-muted)] hover:text-[var(--atelier-ink)]"
            }`}
          >
            <span
              className="text-[12px] text-[var(--atelier-accent)] tabular-nums"
              style={{ fontFamily: "var(--atelier-display)" }}
            >
              {(i + 1).toString().padStart(2, "0")}.
            </span>
            <span className="flex-1 text-[14px] leading-tight">{s.label}</span>
            {isActive && (
              <span
                aria-hidden
                className="absolute right-0 top-2 bottom-2 w-[2px] bg-[var(--atelier-accent)]"
              />
            )}
            {savedSection === s.id && (
              <span data-testid={`toc-stamp-${s.id}`} className="absolute -right-2 top-1">
                <StampSaved />
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
