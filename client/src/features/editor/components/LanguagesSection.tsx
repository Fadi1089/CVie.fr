import { useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import type { CvData } from "@cvie/shared";
import { newId } from "@/lib/newId";
import { FormField } from "./FormField";
import { SectionCard } from "./SectionCard";
import { SectionShell } from "./SectionShell";
import { useFocusAfterRemove } from "../hooks/useFocusAfterRemove";

const LANGUAGE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "natif"] as const;
const DEFAULT_LEVEL: (typeof LANGUAGE_LEVELS)[number] = "B1";
const MAX_LANGUAGES = 50;

export function LanguagesSection({
  highlightedItemId,
  setItemRef,
}: {
  highlightedItemId?: string | null;
  setItemRef?: (itemId: string) => (node: HTMLElement | null) => void;
}) {
  const { control } = useFormContext<CvData>();
  const { fields, append, remove } = useFieldArray<CvData, "languages", "rhfId">({
    control,
    name: "languages",
    keyName: "rhfId",
  });
  const atCap = fields.length >= MAX_LANGUAGES;
  const { containerRef, fallbackRef, focusAfterRemove } = useFocusAfterRemove();

  return (
    <div ref={containerRef}>
      <SectionShell
        ref={fallbackRef}
        title="Langues"
        description="Niveau CECRL (A1–C2) ou natif. Vérifiez le niveau à chaque ajout."
        count={fields.length}
        addLabel="Ajouter une langue"
        disabled={atCap}
        disabledReason={atCap ? `Maximum ${MAX_LANGUAGES} entrées atteint` : undefined}
        onAdd={() =>
          append({
            id: newId(),
            name: "",
            level: DEFAULT_LEVEL,
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
                ? "editor-jump-highlight-item scroll-mt-24 rounded-xl"
                : "scroll-mt-24 rounded-xl"
            }
          >
            <LanguageCard
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

function LanguageCard({
  index,
  onRemove,
}: {
  index: number;
  onRemove: () => void;
}) {
  const {
    register,
    control,
    formState: { errors, dirtyFields },
  } = useFormContext<CvData>();
  const name = useWatch({ control, name: `languages.${index}.name` });
  const level = useWatch({ control, name: `languages.${index}.level` });

  // Show warning only while the seeded default level is still in place AND
  // the user has touched it (flip dirty). Once they pick a non-default
  // level the badge stays gone across reloads.
  const showLevelWarning = useMemo(() => {
    if (level !== DEFAULT_LEVEL) return false;
    const langs = dirtyFields.languages as
      | Array<Record<string, unknown>>
      | undefined;
    return Boolean(langs?.[index]?.level);
  }, [dirtyFields.languages, index, level]);

  return (
    <SectionCard
      title={name?.trim() || "Nouvelle langue"}
      index={index}
      onRemove={onRemove}
    >
      <FormField<CvData>
        name={`languages.${index}.name`}
        label="Langue"
        register={register}
        errors={errors}
        placeholder="ex. Anglais"
      />
      <div className="flex flex-col gap-1">
        <FormField<CvData>
          as="select"
          name={`languages.${index}.level`}
          label="Niveau"
          register={register}
          errors={errors}
        >
          {LANGUAGE_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </FormField>
        {showLevelWarning ? (
          <p className="text-[11px] text-amber-700" aria-live="polite">
            ⚠ Niveau à vérifier
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}
