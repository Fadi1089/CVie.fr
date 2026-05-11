type Props = {
  onExpand: () => void;
  pendingCount?: number;
};

export function AssistantHandle({ onExpand, pendingCount }: Props) {
  const hasPending = !!pendingCount && pendingCount > 0;
  return (
    <div className="bg-[var(--color-paper-soft,#fafaf7)] p-3">
      <button
        type="button"
        onClick={onExpand}
        className="flex w-full items-center gap-2.5 overflow-hidden rounded-[24px] border border-[var(--color-rule)] bg-white px-4 py-2.5 shadow-[0_-6px_18px_0_rgba(0,0,0,0.1)] transition-colors hover:bg-[var(--color-paper-soft,#fafaf7)]"
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
        <span
          aria-hidden
          className="h-1.5 w-2.5 shrink-0 rounded-[1px] bg-[var(--color-ink-soft)]"
        />
      </button>
    </div>
  );
}
