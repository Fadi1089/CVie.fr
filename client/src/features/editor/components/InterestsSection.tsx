import { useFieldArray, useFormContext } from "react-hook-form";
import type { CvData } from "@cvie/shared";
import { newId } from "@/lib/newId";
import { useFocusAfterRemove } from "../hooks/useFocusAfterRemove";

const MAX_INTERESTS = 50;
const MAX_INTEREST_CHARS = 200;

export function InterestsSection() {
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

      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--color-rule)] bg-white/40 px-4 py-6 text-center text-[13px] text-[var(--color-ink-soft)]">
          Aucun centre d'intérêt pour le moment.
        </p>
      ) : (
        <ul className="space-y-2">
          {fields.map((field, index) => (
            <li key={field.rhfId} className="flex items-center gap-2">
              <input
                type="text"
                maxLength={MAX_INTEREST_CHARS}
                {...register(`interests.${index}.name` as const)}
                placeholder="ex. Photographie argentique"
                aria-label={`Centre d'intérêt ${index + 1}`}
                className="block min-h-11 w-full rounded-md border border-[var(--color-ink)]/15 bg-white px-3 py-2 text-[14px] leading-6 text-[var(--color-ink)] outline-none transition-colors focus-visible:border-[var(--color-ink)] focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/20 motion-reduce:transition-none"
              />
              <button
                type="button"
                data-section-remove=""
                onClick={() => {
                  remove(index);
                  focusAfterRemove(index);
                }}
                aria-label={`Supprimer le centre d'intérêt ${index + 1}`}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--color-rule)] bg-white text-[var(--color-ink-soft)] transition-colors hover:border-red-600/40 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/20 motion-reduce:transition-none"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
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
