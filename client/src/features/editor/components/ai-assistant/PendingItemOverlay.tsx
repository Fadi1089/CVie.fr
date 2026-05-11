import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  usePendingItem,
  type Section,
} from "../../hooks/usePendingChanges";

type Props = {
  section: Section;
  id: string;
  children: ReactNode;
};

const ADD_LABEL = "Ajouté par l'Assistant";
const REMOVE_LABEL = "Suppression suggérée par l'Assistant";

export function PendingItemOverlay({ section, id, children }: Props) {
  const pending = usePendingItem(section, id);
  if (!pending) return <>{children}</>;

  const isAdd = pending.action === "add";
  return (
    <div
      className={cn(
        "relative rounded-lg ring-2 ring-offset-2",
        isAdd
          ? "ring-emerald-500/70 ring-offset-emerald-50"
          : "ring-red-500/70 ring-offset-red-50",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-t-lg px-3 py-1.5 text-[11px] font-medium",
          isAdd ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
        )}
      >
        <span>{isAdd ? ADD_LABEL : REMOVE_LABEL}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={pending.revert}
            className="rounded border border-red-500/60 bg-white px-2 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={pending.keep}
            className="rounded border border-emerald-500/60 bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
          >
            Garder
          </button>
        </div>
      </div>
      <div className={cn("rounded-b-lg", !isAdd && "opacity-80")}>{children}</div>
    </div>
  );
}
