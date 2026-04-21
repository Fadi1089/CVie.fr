import type { OverflowMode } from "@cvie/shared";
import { cn } from "@/lib/utils";

type Props = {
  value: OverflowMode;
  onChange: (next: OverflowMode) => void;
};

/**
 * Two-way radio control for the pagination overflow strategy.
 * Sits next to the density slider — shares the same wrapper treatment so
 * the editor header reads as one cohesive cluster of layout controls.
 */
export function OverflowModeSelector({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Mode de débordement"
      className="hidden items-center gap-1.5 rounded-md border border-[var(--color-rule)] bg-white/70 px-2.5 py-1.5 md:inline-flex"
    >
      <span
        aria-hidden="true"
        className="font-mono-caps mr-0.5 text-[10px] tracking-wider text-[var(--color-ink-soft)]"
      >
        Débordement
      </span>
      <OverflowRadio
        current={value}
        option="section"
        label="Par section"
        description="Si un débordement se produit, toute la section saute à la page suivante."
        onChange={onChange}
      />
      <OverflowRadio
        current={value}
        option="element"
        label="Par élément"
        description="Seuls les éléments qui débordent (articles, listes, paragraphes) sautent; le titre reste."
        onChange={onChange}
      />
    </div>
  );
}

function OverflowRadio({
  current,
  option,
  label,
  description,
  onChange,
}: {
  current: OverflowMode;
  option: OverflowMode;
  label: string;
  description: string;
  onChange: (next: OverflowMode) => void;
}) {
  const selected = current === option;
  return (
    <label
      title={description}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors motion-reduce:transition-none",
        selected
          ? "bg-[var(--color-ink)] text-white"
          : "text-[var(--color-ink-soft)] hover:bg-[var(--color-rule)]/40 hover:text-[var(--color-ink)]",
      )}
    >
      <input
        type="radio"
        name="cv-overflow-mode"
        value={option}
        checked={selected}
        onChange={() => onChange(option)}
        className="sr-only"
      />
      {label}
    </label>
  );
}
