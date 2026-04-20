import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  count: number;
  addLabel: string;
  onAdd: () => void;
  /** Disabled when the section has reached its MAX_ARRAY cap. */
  disabled?: boolean;
  /** Helper string shown when `disabled` — e.g. "Maximum 50 entrées atteint". */
  disabledReason?: string;
  children: React.ReactNode;
};

/**
 * Consistent wrapper for every repeating section:
 *   - `<h2>` heading for screen-reader jumping
 *   - entry-count pill (French-plural-correct: "0 entrée" is ungrammatical)
 *   - Ajouter button (also surfaced inline inside the empty state)
 * Each section in the editor is rendered inside one of these, so headings
 * are semantic and the add affordance is always in the same place.
 */
export const SectionShell = forwardRef<HTMLButtonElement, Props>(function SectionShell(
  {
    title,
    description,
    count,
    addLabel,
    onAdd,
    disabled,
    disabledReason,
    children,
  },
  addButtonRef,
) {
  const pluralLabel = count <= 1 ? "entrée" : "entrées";
  return (
    <section className="space-y-5">
      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--color-rule)] pb-3">
        <div>
          <h2 className="font-display text-[22px] font-medium text-[var(--color-ink)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-[13px] text-[var(--color-ink-soft)]">
              {description}
            </p>
          ) : null}
        </div>
        <span className="font-mono-caps shrink-0 text-[10px] text-[var(--color-ink-soft)]">
          {String(count).padStart(2, "0")} · {pluralLabel}
        </span>
      </header>

      {count > 0 ? (
        <div className="space-y-4">{children}</div>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--color-rule)] bg-white/40 px-4 py-6 text-center">
          <p className="text-[13px] text-[var(--color-ink-soft)]">
            Aucune entrée pour le moment.
          </p>
          <button
            type="button"
            onClick={onAdd}
            disabled={disabled}
            className={cn(
              "mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--color-ink)]/30 bg-white px-4 py-2 text-[13px] font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 motion-reduce:transition-none",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span aria-hidden="true">+</span>
            {addLabel}
          </button>
        </div>
      )}

      {count > 0 ? (
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            ref={addButtonRef}
            onClick={onAdd}
            disabled={disabled}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--color-ink)]/20 bg-white px-4 py-2 text-[13px] font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 motion-reduce:transition-none",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span aria-hidden="true">+</span>
            {addLabel}
          </button>
          {disabled && disabledReason ? (
            <p className="text-[12px] text-[var(--color-ink-soft)]">
              {disabledReason}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
});
