type Props = {
  onCollapse: () => void;
  onReset: () => void;
  resetDisabled?: boolean;
};

export function AssistantToolbar({ onCollapse, onReset, resetDisabled }: Props) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-rule)] bg-white px-3 py-2">
      <button
        type="button"
        onClick={onCollapse}
        className="flex items-center gap-2 text-[10px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
        aria-label="Réduire le panneau"
      >
        <span
          aria-hidden
          className="inline-block h-1.5 w-3 rounded-[1px] bg-current"
        />
        Réduire
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          disabled={resetDisabled}
          className="flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-[var(--color-ink-soft)] text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Nouvelle conversation"
          title="Nouvelle conversation"
        >
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 8a5 5 0 1 1 1.5 3.5" strokeLinecap="round" />
            <path d="M3 4v3.5h3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={resetDisabled}
          className="flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-[var(--color-ink-soft)] text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Effacer le contexte"
          title="Effacer le contexte"
        >
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M5 4l1 9a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1l1-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
