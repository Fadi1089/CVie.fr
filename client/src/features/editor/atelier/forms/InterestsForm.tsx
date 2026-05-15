import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { TextInput } from "./_atoms/TextInput";

export function InterestsForm() {
  const { control } = useFormContext();
  const { fields, append, remove, swap } = useFieldArray({ control, name: "interests" });

  return (
    <div className="grid gap-4">
      {fields.map((field, i) => (
        <article
          key={field.id}
          className="border-t border-[var(--atelier-rule)]/20 pt-3 flex items-center gap-4"
        >
          <span
            className="text-[14px] text-[var(--atelier-accent)] tabular-nums"
            style={{ fontFamily: "var(--atelier-display)" }}
          >
            #{(i + 1).toString().padStart(2, "0")}
          </span>
          <div className="flex-1">
            <Controller
              control={control}
              name={`interests.${i}.name`}
              render={({ field: f }) => (
                <TextInput value={f.value ?? ""} onChange={f.onChange} label="Centre d'intérêt" />
              )}
            />
          </div>
          <div className="flex gap-2 text-[10px] tracking-[0.18em] text-[var(--atelier-muted)]">
            {i > 0 && (
              <button type="button" onClick={() => swap(i, i - 1)} aria-label="Déplacer ↑">
                ↑
              </button>
            )}
            {i < fields.length - 1 && (
              <button type="button" onClick={() => swap(i, i + 1)} aria-label="Déplacer ↓">
                ↓
              </button>
            )}
            <button type="button" onClick={() => remove(i)} aria-label="Supprimer">
              ×
            </button>
          </div>
        </article>
      ))}
      {fields.length < 10 && (
        <button
          type="button"
          onClick={() => append({ id: crypto.randomUUID(), name: "" })}
          className="self-start text-[11px] tracking-[0.18em] uppercase text-[var(--atelier-accent)] border-b border-[var(--atelier-accent)] pb-0.5"
          style={{ fontFamily: "var(--atelier-body)" }}
        >
          + Ajouter un centre d'intérêt
        </button>
      )}
    </div>
  );
}
