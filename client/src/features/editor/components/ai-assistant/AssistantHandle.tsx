type Props = {
  onExpand: () => void;
  pendingCount?: number;
};

export function AssistantHandle({ onExpand, pendingCount }: Props) {
  const hasPending = !!pendingCount && pendingCount > 0;
  return (
    <button
      type="button"
      onClick={onExpand}
      className="flex w-full items-center gap-2.5 overflow-hidden rounded-full border border-[var(--color-rule)] bg-white px-4 py-2.5 shadow-[0_-6px_18px_0_rgba(0,0,0,0.1)] transition-colors hover:bg-[var(--color-paper-soft,#fafaf7)]"
      aria-expanded={false}
      aria-controls="cv-assistant-panel"
    >
      <span
        aria-hidden
        className="h-3.5 w-3.5 shrink-0 rounded-[3px] bg-[#b89968]"
      />
      <span className="flex-1 text-left text-[11px] font-medium text-[var(--color-ink-soft)]">
        Assistant CVie  ·  Cliquez pour ouvrir
      </span>
      {hasPending && (
        <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
          {pendingCount} changement{pendingCount > 1 ? "s" : ""}
        </span>
      )}
      <svg
        viewBox="0 0 10 6"
        className="h-1.5 w-2.5 shrink-0 text-[var(--color-ink-soft)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M1 5l4-4 4 4" />
      </svg>
    </button>
  );
}
