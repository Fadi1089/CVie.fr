import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { TextInput } from "./_atoms/TextInput";
import { Select } from "./_atoms/Select";
import { CardHeader } from "./_atoms/CardHeader";

const SKILL_LEVELS = ["débutant", "intermédiaire", "avancé", "expert"] as const;

export function SkillsForm() {
  const { control } = useFormContext();
  const { fields, append, remove, swap } = useFieldArray({ control, name: "skills" });

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
          <div className="grid grid-cols-3 gap-x-6">
            <Controller
              control={control}
              name={`skills.${i}.name`}
              render={({ field: f }) => (
                <TextInput value={f.value ?? ""} onChange={f.onChange} label="Compétence" />
              )}
            />
            <Controller
              control={control}
              name={`skills.${i}.level`}
              render={({ field: f }) => (
                <Select
                  label="Niveau"
                  options={SKILL_LEVELS}
                  placeholder="—"
                  value={f.value ?? ""}
                  onChange={(v) => f.onChange(v || undefined)}
                />
              )}
            />
            <Controller
              control={control}
              name={`skills.${i}.category`}
              render={({ field: f }) => (
                <TextInput value={f.value ?? ""} onChange={f.onChange} label="Catégorie" />
              )}
            />
          </div>
        </article>
      ))}
      <button
        type="button"
        onClick={() => append({ id: crypto.randomUUID(), name: "", category: "" })}
        className="self-start text-[11px] tracking-[0.18em] uppercase text-[var(--atelier-accent)] border-b border-[var(--atelier-accent)] pb-0.5"
        style={{ fontFamily: "var(--atelier-body)" }}
      >
        + Ajouter une compétence
      </button>
    </div>
  );
}
