import type { CvData } from "@cvie/shared";
import { humanizePath } from "../../hooks/useEditorJump";

type Props = {
  path: string;
  cv?: CvData;
  onClick: () => void;
};

export function ChangeChip({ path, cv, onClick }: Props) {
  const label = humanizePath(path, cv);
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-rule)] bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-ink-soft)] hover:bg-[var(--color-paper-soft,#fafaf7)] hover:text-[var(--color-ink)]"
      title={`Aller à : ${label}`}
    >
      <span className="text-[var(--color-ink-soft)]">Édition CV ·</span>
      <span className="text-[var(--color-ink)]">{label}</span>
    </button>
  );
}
