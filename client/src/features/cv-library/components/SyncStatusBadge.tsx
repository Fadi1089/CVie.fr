import type { SyncStatus } from "../store/types";

type Props = {
  status: SyncStatus;
  authed: boolean;
};

export function SyncStatusBadge({ status, authed }: Props) {
  let label = "";
  let tone: "soft" | "amber" | "red" = "soft";
  switch (status) {
    case "saving":
      label = "Enregistrement…";
      break;
    case "saved":
      label = authed ? "Enregistré" : "Brouillon enregistré";
      break;
    case "offline":
      label = "Hors-ligne · synchronisation en attente";
      tone = "amber";
      break;
    case "error":
      label = "Échec de la synchro · Recharger";
      tone = "red";
      break;
    case "idle":
    default:
      label = authed ? "Prêt" : "Brouillon enregistré";
      break;
  }

  return (
    <button
      type="button"
      onClick={
        status === "error" ? () => window.location.reload() : undefined
      }
      disabled={status !== "error"}
      className={
        "font-mono-caps text-[10px] tracking-[0.18em] " +
        (tone === "amber"
          ? "text-amber-600"
          : tone === "red"
            ? "cursor-pointer text-red-600 hover:underline"
            : "text-[var(--color-ink-soft)]")
      }
      aria-live="polite"
    >
      {label.toUpperCase()}
    </button>
  );
}
