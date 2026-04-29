import { Dialog } from "@base-ui/react/dialog";
import { useAuth0 } from "@auth0/auth0-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
};

export function SignInModal({ open, onOpenChange, reason }: Props) {
  const { loginWithRedirect } = useAuth0();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-6 shadow-2xl">
          <Dialog.Title className="text-base font-semibold text-[var(--color-ink)]">
            Connexion requise
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-[var(--color-ink-soft)]">
            {reason ?? "Connectez-vous pour utiliser cette fonctionnalité."}
          </Dialog.Description>
          <div className="mt-5 flex justify-end gap-3">
            <Dialog.Close className="rounded-md px-3 py-1.5 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
              Annuler
            </Dialog.Close>
            <button
              type="button"
              onClick={() =>
                loginWithRedirect({
                  appState: {
                    returnTo: window.location.pathname + window.location.search,
                  },
                })
              }
              className="rounded-md bg-[var(--color-ink)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Se connecter
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
