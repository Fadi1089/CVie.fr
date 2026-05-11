type Props = {
  onExpand: () => void;
  pendingCount?: number;
};

export function AssistantHandle({ onExpand, pendingCount }: Props) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="font-mono-caps flex h-[44px] w-full items-center justify-between gap-2 rounded-md border border-[var(--color-rule)] bg-white px-3 text-[11px] text-[var(--color-ink)] hover:bg-[var(--color-paper-soft,#fbf7f0)]"
      aria-expanded={false}
      aria-controls="cv-assistant-panel"
    >
      <span className="flex items-center gap-2">
        <span aria-hidden>✨</span>
        Assistant rédacteur
        {pendingCount && pendingCount > 0 ? (
          <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-700">
            {pendingCount} changement{pendingCount > 1 ? "s" : ""}
          </span>
        ) : null}
      </span>
      <span aria-hidden>▲</span>
    </button>
  );
}
