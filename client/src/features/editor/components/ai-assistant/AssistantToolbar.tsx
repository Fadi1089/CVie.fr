type Props = {
  onCollapse: () => void;
  onReset: () => void;
  resetDisabled?: boolean;
};

export function AssistantToolbar({ onCollapse, onReset, resetDisabled }: Props) {
  return (
    <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[var(--color-rule)] bg-white pl-12 pr-3">
      <button
        type="button"
        onClick={onReset}
        disabled={resetDisabled}
        className="flex items-center gap-1.5 rounded-full border border-[var(--color-rule)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-ink-soft)] hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Nouvelle conversation"
        title="Nouvelle conversation"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M11.5 2.5l2 2-7 7-2.5.5.5-2.5z" />
          <path d="M13 7v5.5A1.5 1.5 0 0 1 11.5 14h-8A1.5 1.5 0 0 1 2 12.5v-8A1.5 1.5 0 0 1 3.5 3H9" />
        </svg>
        Nouvelle conversation
      </button>
      <button
        type="button"
        onClick={onCollapse}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-paper-soft,#fafaf7)] hover:text-[var(--color-ink)]"
        aria-label="Réduire le panneau"
        title="Réduire"
      >
        <svg viewBox="0 0 10 6" className="h-1.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>
    </div>
  );
}
