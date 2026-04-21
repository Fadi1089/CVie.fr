import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function CvResetButton({ onReset }: { onReset: () => void }) {
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    onReset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--color-rule)] px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 motion-reduce:transition-none",
              "bg-[var(--color-paper)] text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-deep)] hover:text-[var(--color-ink)]",
            )}
            title="Effacer le CV et recommencer"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            <span>Effacer le CV</span>
          </button>
        }
      />
      <DialogContent
        showCloseButton={false}
        className="w-[min(calc(100vw-2rem),24rem)] max-w-none sm:max-w-none"
      >
        <DialogHeader>
          <DialogTitle>Effacer le CV ?</DialogTitle>
          <DialogDescription>
            Toutes les informations saisies seront supprimées définitivement. Cette
            action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={
              <button
                type="button"
                className="inline-flex min-h-9 items-center rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 motion-reduce:transition-none"
              >
                Annuler
              </button>
            }
          />
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex min-h-9 items-center rounded-md bg-red-700 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700/40 motion-reduce:transition-none"
          >
            Effacer
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
