import { useFormContext, useFieldArray, type UseFormRegister, type FieldArrayWithId } from "react-hook-form";
import type { CvData } from "@cvie/shared";
import { newId } from "@/lib/newId";
import { useFocusAfterRemove } from "../hooks/useFocusAfterRemove";
import { usePendingItem, usePendingRemovedItems } from "../hooks/usePendingChanges";
import { PendingRemoveGhost } from "./ai-assistant/PendingRemoveGhost";

const MAX_INTERESTS = 50;
const MAX_INTEREST_CHARS = 200;

export function InterestsSection({
  highlightedItemId,
  setItemRef,
}: {
  highlightedItemId?: string | null;
  setItemRef?: (itemId: string) => (node: HTMLElement | null) => void;
}) {
  const { register, control } = useFormContext<CvData>();
  const { fields, append, remove } = useFieldArray<CvData, "interests", "rhfId">({
    control,
    name: "interests",
    keyName: "rhfId",
  });
  const atCap = fields.length >= MAX_INTERESTS;
  const { containerRef, fallbackRef, focusAfterRemove } = useFocusAfterRemove<
    HTMLElement,
    HTMLButtonElement
  >();
  const pendingRemoved = usePendingRemovedItems("interests");

  const realRows = fields.map((field, index) => (
    <InterestRow
      key={field.rhfId}
      field={field}
      index={index}
      register={register}
      highlightedItemId={highlightedItemId}
      setItemRef={setItemRef}
      onRemove={() => {
        remove(index);
        focusAfterRemove(index);
      }}
    />
  ));

  const rows: React.ReactNode[] = [...realRows];
  for (const ghost of pendingRemoved) {
    const pos = Math.min(Math.max(ghost.originalIndex, 0), rows.length);
    const label = String(ghost.item.name ?? "Centre d'intérêt");
    rows.splice(
      pos,
      0,
      <li
        key={`ghost-${ghost.id}`}
        ref={setItemRef ? setItemRef(ghost.id) : undefined}
        data-editor-item-id={ghost.id}
        className="scroll-mt-24"
      >
        <PendingRemoveGhost label={label} onKeep={ghost.keep} onRevert={ghost.revert} />
      </li>,
    );
  }

  return (
    <section className="space-y-5" ref={containerRef}>
      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--color-rule)] pb-3">
        <div>
          <h2 className="font-display text-[22px] font-medium text-[var(--color-ink)]">
            Centres d'intérêt
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--color-ink-soft)]">
            Trois à cinq lignes suffisent. Gardez-les concrets.
          </p>
        </div>
        <span className="font-mono-caps shrink-0 text-[10px] text-[var(--color-ink-soft)]">
          {String(fields.length).padStart(2, "0")}
        </span>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--color-rule)] bg-white/40 px-4 py-6 text-center text-[13px] text-[var(--color-ink-soft)]">
          Aucun centre d'intérêt pour le moment.
        </p>
      ) : (
        <ul className="space-y-2">{rows}</ul>
      )}

      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          ref={fallbackRef}
          onClick={() =>
            append({
              id: newId(),
              name: "",
            })
          }
          disabled={atCap}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--color-ink)]/20 bg-white px-4 py-2 text-[13px] font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
        >
          <span aria-hidden="true">+</span>
          Ajouter un centre d'intérêt
        </button>
        {atCap ? (
          <p className="text-[12px] text-[var(--color-ink-soft)]">
            Maximum {MAX_INTERESTS} entrées atteint
          </p>
        ) : null}
      </div>
    </section>
  );
}

function InterestRow({
  field,
  index,
  register,
  highlightedItemId,
  setItemRef,
  onRemove,
}: {
  field: FieldArrayWithId<CvData, "interests", "rhfId">;
  index: number;
  register: UseFormRegister<CvData>;
  highlightedItemId?: string | null;
  setItemRef?: (itemId: string) => (node: HTMLElement | null) => void;
  onRemove: () => void;
}) {
  const pending = usePendingItem("interests", field.id);
  const isAdded = pending?.action === "add";
  const baseClasses = "flex items-center gap-2 rounded-md scroll-mt-24";
  const highlightClass =
    highlightedItemId === field.id ? " editor-jump-highlight-item" : "";
  const addedClass = isAdded
    ? " relative ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-[var(--color-paper)]"
    : "";

  return (
    <li
      ref={setItemRef ? setItemRef(field.id) : undefined}
      data-editor-item-id={field.id}
      className={`${baseClasses}${highlightClass}${addedClass}`}
    >
      <input
        type="text"
        maxLength={MAX_INTEREST_CHARS}
        {...register(`interests.${index}.name` as const)}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData("text");
          const input = e.currentTarget;
          const start = input.selectionStart ?? input.value.length;
          const end = input.selectionEnd ?? input.value.length;
          const before = input.value.slice(0, start);
          const after = input.value.slice(end);
          const beforePoints = [...before].length;
          const afterPoints = [...after].length;
          const budget = Math.max(
            0,
            MAX_INTEREST_CHARS - beforePoints - afterPoints,
          );
          const clamped = [...pasted].slice(0, budget).join("");
          if (clamped === pasted) return;
          e.preventDefault();
          input.setRangeText(clamped, start, end, "end");
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }}
        placeholder="ex. Photographie argentique"
        aria-label={`Centre d'intérêt ${index + 1}`}
        className="block min-h-11 w-full rounded-md border border-[var(--color-ink)]/15 bg-white px-3 py-2 text-[14px] leading-6 text-[var(--color-ink)] outline-none transition-colors focus-visible:border-[var(--color-ink)] focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/20 motion-reduce:transition-none"
      />
      {isAdded ? (
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={pending.revert}
            className="inline-flex h-11 items-center gap-1 rounded-md border border-red-500 bg-white px-3 text-[12px] font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 motion-reduce:transition-none"
            aria-label={`Annuler l'ajout du centre d'intérêt ${index + 1}`}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={pending.keep}
            className="inline-flex h-11 items-center gap-1 rounded-md border border-emerald-500 bg-white px-3 text-[12px] font-medium text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 motion-reduce:transition-none"
            aria-label={`Garder le centre d'intérêt ${index + 1}`}
          >
            Garder
          </button>
        </div>
      ) : null}
      <button
        type="button"
        data-section-remove=""
        onClick={onRemove}
        aria-label={`Supprimer le centre d'intérêt ${index + 1}`}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--color-rule)] bg-white text-[var(--color-ink-soft)] transition-colors hover:border-red-600/40 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/20 motion-reduce:transition-none"
      >
        <span aria-hidden="true">×</span>
      </button>
    </li>
  );
}
