import { Folder as FolderIcon, FolderOpen, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Folder } from "../store/types";

type Props = {
  folder: Folder;
  count: number;
  expanded: boolean;
  collapsed?: boolean;
  accentColor?: string;
  onToggle: () => void;
  onRename?: (newName: string) => Promise<void>;
  onDelete?: () => void;
  onExpandSidebar?: () => void;
};

export function FolderHeader({
  folder,
  count,
  expanded,
  collapsed = false,
  accentColor,
  onToggle,
  onRename,
  onDelete,
  onExpandSidebar,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(folder.name);
  const isTrash = folder.isSystem && folder.ttlDays !== null;
  const Icon = isTrash ? Trash2 : expanded ? FolderOpen : FolderIcon;

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

  const handleClick = () => {
    if (collapsed) {
      onExpandSidebar?.();
      if (!expanded) onToggle();
      return;
    }
    onToggle();
  };

  return (
    <div
      className="group relative h-9 w-full overflow-hidden rounded-lg hover:bg-white/40"
      onContextMenu={(e) => {
        if (collapsed || folder.isSystem) return;
        e.preventDefault();
        setEditing(true);
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        title={collapsed ? folder.name : undefined}
        aria-label={collapsed ? folder.name : undefined}
        className="block h-full w-full text-left"
      >
        <span
          aria-hidden
          className="absolute left-[17px] top-1/2 -translate-y-1/2"
          style={{ color: accentColor ?? "var(--color-ink-soft)" }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        {!editing ? (
          <span
            className={cn(
              "font-mono-caps absolute left-9 right-3 top-1/2 -translate-y-1/2 truncate text-[10px] tracking-[0.18em]",
              "transition-opacity duration-[180ms]",
              collapsed ? "opacity-0" : "opacity-100",
            )}
            style={{ color: accentColor ?? "var(--color-ink-soft)" }}
          >
            {folder.name.toUpperCase()} ({count})
          </span>
        ) : null}
      </button>
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
          className="font-mono-caps absolute left-9 right-3 top-1/2 -translate-y-1/2 bg-transparent text-[10px] tracking-[0.18em] outline-none"
          maxLength={64}
        />
      ) : null}
      {!collapsed && !folder.isSystem && onDelete ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Supprimer le dossier"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 opacity-0 transition group-hover:opacity-100 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
