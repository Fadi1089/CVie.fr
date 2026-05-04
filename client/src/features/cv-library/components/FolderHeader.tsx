import { ChevronDown, ChevronRight, Folder as FolderIcon, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Folder } from "../store/types";

type Props = {
  folder: Folder;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  onRename?: (newName: string) => Promise<void>;
  onDelete?: () => void;
};

export function FolderHeader({
  folder,
  count,
  expanded,
  onToggle,
  onRename,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(folder.name);
  const Icon = folder.isSystem && folder.ttlDays !== null ? Trash2 : FolderIcon;

  const commit = async () => {
    if (!onRename) return setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === folder.name) {
      setEditing(false);
      return;
    }
    try {
      await onRename(trimmed);
    } finally {
      setEditing(false);
    }
  };

  return (
    <div
      className="group flex items-center gap-2 px-3 py-2 hover:bg-white/40"
      onContextMenu={(e) => {
        if (folder.isSystem) return;
        e.preventDefault();
        setEditing(true);
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex flex-1 items-center gap-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-[var(--color-ink-soft)]" aria-hidden />
        ) : (
          <ChevronRight className="h-3 w-3 text-[var(--color-ink-soft)]" aria-hidden />
        )}
        <Icon className="h-3.5 w-3.5 text-[var(--color-ink-soft)]" aria-hidden />
        {editing && onRename ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(folder.name);
                setEditing(false);
              }
            }}
            className="font-mono-caps flex-1 bg-transparent text-[10px] tracking-[0.18em] outline-none"
            maxLength={64}
          />
        ) : (
          <span className="font-mono-caps flex-1 text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)]">
            {folder.name.toUpperCase()} ({count})
          </span>
        )}
      </button>
      {!folder.isSystem && onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Supprimer le dossier"
          className="opacity-0 transition group-hover:opacity-100 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
