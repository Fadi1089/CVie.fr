import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { TextInput } from "./_atoms/TextInput";
import { TextArea } from "./_atoms/TextArea";
import { DateInput } from "./_atoms/DateInput";
import { CardHeader } from "./_atoms/CardHeader";

export function FormationsForm() {
  const { control } = useFormContext();
  const { fields, append, remove, swap } = useFieldArray({ control, name: "formations" });

  return (
    <div className="grid gap-8">
      {fields.map((field, i) => (
        <article key={field.id} className="border-t border-[var(--atelier-rule)]/20 pt-6">
          <CardHeader
            index={i}
            canMoveUp={i > 0}
            canMoveDown={i < fields.length - 1}
            onMoveUp={() => swap(i, i - 1)}
            onMoveDown={() => swap(i, i + 1)}
            onRemove={() => remove(i)}
          />

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
