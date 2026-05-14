import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { TextInput } from "./_atoms/TextInput";
import { TextArea } from "./_atoms/TextArea";
import { DateInput } from "./_atoms/DateInput";

export function FormationsForm() {
  const { control } = useFormContext();
  const { fields, append, remove, swap } = useFieldArray({ control, name: "formations" });

  return (
    <div className="grid gap-8">
      {fields.map((field, i) => (
        <article key={field.id} className="border-t border-[var(--atelier-rule)]/20 pt-6">
          <header className="flex items-center justify-between mb-3">
            <span
              className="text-[14px] text-[var(--atelier-accent)] tabular-nums"
              style={{ fontFamily: "var(--atelier-display)" }}
            >
              #{(i + 1).toString().padStart(2, "0")}
            </span>
            <div className="flex gap-2 text-[10px] tracking-[0.18em] text-[var(--atelier-muted)]">
              {i > 0 && (
                <button type="button" onClick={() => swap(i, i - 1)} aria-label="Déplacer ↑">↑</button>
              )}
              {i < fields.length - 1 && (
                <button type="button" onClick={() => swap(i, i + 1)} aria-label="Déplacer ↓">↓</button>
              )}
              <button type="button" onClick={() => remove(i)} aria-label="Supprimer">×</button>
            </div>
          </header>

          <Controller
            control={control}
            name={`formations.${i}.degree`}
            render={({ field: f }) => (
              <TextInput value={f.value ?? ""} onChange={f.onChange} label="Diplôme" />
            )}
          />
          <Controller
            control={control}
            name={`formations.${i}.school`}
            render={({ field: f }) => (
              <TextInput value={f.value ?? ""} onChange={f.onChange} label="École" />
            )}
          />
          <div className="grid grid-cols-3 gap-x-6">
            <Controller
              control={control}
              name={`formations.${i}.city`}
              render={({ field: f }) => (
                <TextInput value={f.value ?? ""} onChange={f.onChange} label="Ville" />
              )}
            />
            <Controller
              control={control}
              name={`formations.${i}.startDate`}
              render={({ field: f }) => (
                <DateInput value={f.value ?? ""} onChange={f.onChange} label="Début" />
              )}
            />
            <Controller
              control={control}
              name={`formations.${i}.endDate`}
              render={({ field: f }) => (
                <DateInput value={f.value ?? ""} onChange={f.onChange} label="Fin" />
              )}
            />
          </div>
          <Controller
            control={control}
            name={`formations.${i}.description`}
            render={({ field: f }) => (
              <TextArea value={f.value ?? ""} onChange={f.onChange} label="Description" rows={3} />
            )}
          />
        </article>
      ))}

      <button
        type="button"
        onClick={() =>
          append({
            id: crypto.randomUUID(),
            degree: "",
            school: "",
            startDate: "",
            endDate: "",
            description: "",
          })
        }
        className="self-start text-[11px] tracking-[0.18em] uppercase text-[var(--atelier-accent)] border-b border-[var(--atelier-accent)] pb-0.5"
        style={{ fontFamily: "var(--atelier-body)" }}
      >
        + Ajouter une formation
      </button>
    </div>
  );
}
