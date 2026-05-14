import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { TextInput } from "./_atoms/TextInput";
import { Select } from "./_atoms/Select";
import { CardHeader } from "./_atoms/CardHeader";

const LANG_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "natif"] as const;

export function LanguagesForm() {
  const { control } = useFormContext();
  const { fields, append, remove, swap } = useFieldArray({ control, name: "languages" });

  return (
    <div className="grid gap-6">
      {fields.map((field, i) => (
        <article key={field.id} className="border-t border-[var(--atelier-rule)]/20 pt-4">
          <CardHeader
            index={i}
            canMoveUp={i > 0}
            canMoveDown={i < fields.length - 1}
            onMoveUp={() => swap(i, i - 1)}
            onMoveDown={() => swap(i, i + 1)}
            onRemove={() => remove(i)}
          />
          <div className="grid grid-cols-2 gap-x-6">
            <Controller
              control={control}
              name={`languages.${i}.name`}
              render={({ field: f }) => (
                <TextInput value={f.value ?? ""} onChange={f.onChange} label="Langue" />
              )}
            />
            <Controller
              control={control}
              name={`languages.${i}.level`}
              render={({ field: f }) => (
                <Select
                  label="Niveau"
                  options={LANG_LEVELS}
                  value={f.value ?? "B1"}
                  onChange={f.onChange}
                />
              )}
            />
          </div>
        </article>
      ))}
      <button
        type="button"
        onClick={() => append({ id: crypto.randomUUID(), name: "", level: "B1" })}
        className="self-start text-[11px] tracking-[0.18em] uppercase text-[var(--atelier-accent)] border-b border-[var(--atelier-accent)] pb-0.5"
        style={{ fontFamily: "var(--atelier-body)" }}
      >
        + Ajouter une langue
      </button>
    </div>
  );
}
