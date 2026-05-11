import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import type { CvData } from "@cvie/shared";
import { newId } from "@/lib/newId";
import { FormField } from "./FormField";
import { SectionCard } from "./SectionCard";
import { SectionShell } from "./SectionShell";
import { useFocusAfterRemove } from "../hooks/useFocusAfterRemove";

const SKILL_LEVELS = ["débutant", "intermédiaire", "avancé", "expert"] as const;
const MAX_SKILLS = 50;

export function SkillsSection({
  highlightedItemId,
  setItemRef,
}: {
  highlightedItemId?: string | null;
  setItemRef?: (itemId: string) => (node: HTMLElement | null) => void;
}) {
  const { control } = useFormContext<CvData>();
  const { fields, append, remove } = useFieldArray<CvData, "skills", "rhfId">({
    control,
    name: "skills",
    keyName: "rhfId",
  });
  const atCap = fields.length >= MAX_SKILLS;
  const { containerRef, fallbackRef, focusAfterRemove } = useFocusAfterRemove();

  return (
    <div ref={containerRef}>
      <SectionShell
        ref={fallbackRef}
        title="Compétences"
        description="Langages, frameworks, outils. Regroupez-les par catégorie si vous le souhaitez."
        count={fields.length}
        addLabel="Ajouter une compétence"
        disabled={atCap}
        disabledReason={atCap ? `Maximum ${MAX_SKILLS} entrées atteint` : undefined}
        onAdd={() =>
          append({
            id: newId(),
            name: "",
          })
        }
      >
        {fields.map((field, index) => (
          <div
            key={field.rhfId}
            ref={setItemRef ? setItemRef(field.id) : undefined}
            data-editor-item-id={field.id}
            className={
              highlightedItemId === field.id
                ? "editor-jump-highlight-item scroll-mt-24 rounded-md"
                : "scroll-mt-24 rounded-md"
            }
          >
            <SkillCard
              index={index}
              onRemove={() => {
                remove(index);
                focusAfterRemove(index);
              }}
            />
          </div>
        ))}
      </SectionShell>
    </div>
  );
}

function SkillCard({
  index,
  onRemove,
}: {
  index: number;
  onRemove: () => void;
}) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<CvData>();
  const name = useWatch({ control, name: `skills.${index}.name` });

  return (
    <SectionCard
      title={name?.trim() || "Nouvelle compétence"}
      index={index}
      onRemove={onRemove}
    >
      <FormField<CvData>
        name={`skills.${index}.name`}
        label="Nom"
        register={register}
        errors={errors}
        placeholder="ex. TypeScript"
      />
      <FormField<CvData>
        as="select"
        name={`skills.${index}.level`}
        label="Niveau (facultatif)"
        register={register}
        errors={errors}
        placeholder="Non précisé"
        placeholderSelectable
        registerOptions={{
          // Coerce empty string back to undefined so the optional enum
          // validates cleanly when the user picks the placeholder option.
          setValueAs: (v) => (v === "" ? undefined : v),
        }}
      >
        {SKILL_LEVELS.map((lvl) => (
          <option key={lvl} value={lvl}>
            {lvl}
          </option>
        ))}
      </FormField>
      <FormField<CvData>
        name={`skills.${index}.category`}
        label="Catégorie (facultatif)"
        register={register}
        errors={errors}
        placeholder="ex. Langages"
        className="sm:col-span-2"
      />
    </SectionCard>
  );
}
