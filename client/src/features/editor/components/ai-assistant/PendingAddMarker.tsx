import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePendingItem, type Section } from "../../hooks/usePendingChanges";

type Props = {
  section: Section;
  id: string;
  children: ReactNode;
};

/**
 * Wraps a section row. If the row corresponds to a pending "add" from the
 * AI, paints a soft green ring around it and surfaces a small "Annuler"
 * pill in the top-right corner. The row is already applied to the form —
 * the user only needs the pill if they want to back the change out.
 */
export function PendingAddMarker({ section, id, children }: Props) {
  const pending = usePendingItem(section, id);
  if (!pending || pending.action !== "add") return <>{children}</>;
  return (
    <div className="relative rounded-lg ring-2 ring-emerald-400/70">
      <span
        className={cn(
          "pointer-events-none absolute -top-2 left-3 z-10 rounded-full bg-emerald-500 px-2 py-0.5",
          "text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm",
        )}
      >
        Ajouté par l'Assistant
      </span>
      <button
        type="button"
        onClick={pending.revert}
        className={cn(
          "absolute -top-3 right-3 z-10 rounded-full border border-red-500 bg-white px-2 py-0.5",
          "text-[11px] font-medium text-red-700 shadow-sm hover:bg-red-50",
        )}
      >
        Annuler
      </button>
      {children}
    </div>
  );
}
