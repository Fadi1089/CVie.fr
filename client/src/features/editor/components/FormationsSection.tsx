import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import type { CvData } from "@cvie/shared";
import { newId } from "@/lib/newId";
import { FormField } from "./FormField";
import { MonthYearPicker } from "./MonthYearPicker";
import { SectionCard } from "./SectionCard";
import { SectionShell } from "./SectionShell";
import { useFocusAfterRemove } from "../hooks/useFocusAfterRemove";
import { usePendingRemovedItems } from "../hooks/usePendingChanges";
import { PendingAddMarker } from "./ai-assistant/PendingAddMarker";
import { PendingRemoveGhost } from "./ai-assistant/PendingRemoveGhost";

const MAX_FORMATIONS = 50;

export function FormationsSection({
  highlightedItemId,
  setItemRef,
}: {
  highlightedItemId?: string | null;
  setItemRef?: (itemId: string) => (node: HTMLElement | null) => void;
}) {
  const { control } = useFormContext<CvData>();
  const { fields, append, remove } = useFieldArray<CvData, "formations", "rhfId">({
    control,
    name: "formations",
    keyName: "rhfId",
  });
  const atCap = fields.length >= MAX_FORMATIONS;
  const { containerRef, fallbackRef, focusAfterRemove } = useFocusAfterRemove();
  const pendingRemoved = usePendingRemovedItems("formations");

  const realRows = fields.map((field, index) => (
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
      <PendingAddMarker section="formations" id={field.id}>
        <FormationCard
          index={index}
          onRemove={() => {
            remove(index);
            focusAfterRemove(index);
          }}
        />
      </PendingAddMarker>
    </div>
  ));

  const rows: React.ReactNode[] = [...realRows];
  for (const ghost of pendingRemoved) {
    const pos = Math.min(Math.max(ghost.originalIndex, 0), rows.length);
    const title = String(ghost.item.degree ?? "Formation");
    const school = ghost.item.school ? String(ghost.item.school) : undefined;
    rows.splice(
      pos,
      0,
      <div
        key={`ghost-${ghost.id}`}
        ref={setItemRef ? setItemRef(ghost.id) : undefined}
        data-editor-item-id={ghost.id}
        className="scroll-mt-24"
      >
        <PendingRemoveGhost
          label={title}
          sublabel={school}
          onKeep={ghost.keep}
          onRevert={ghost.revert}
        />
      </div>,
    );
  }

  return (
    <div ref={containerRef}>
      <SectionShell
        ref={fallbackRef}
        title="Formations"
        description="Diplômes et études. L'ordre est libre — la plus récente en premier est la convention française."
        count={fields.length}
        addLabel="Ajouter une formation"
        disabled={atCap}
        disabledReason={atCap ? `Maximum ${MAX_FORMATIONS} entrées atteint` : undefined}
        onAdd={() =>
          append({
            id: newId(),
            degree: "",
            school: "",
            startDate: "",
          })
        }
      >
        {rows}
      </SectionShell>
    </div>
  );
}

function FormationCard({
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

  const degree = useWatch({ control, name: `formations.${index}.degree` });
  const school = useWatch({ control, name: `formations.${index}.school` });

  return (
    <SectionCard
      title={degree?.trim() || "Nouvelle formation"}
      subtitle={school?.trim() || undefined}
      index={index}
      onRemove={onRemove}
    >
      <FormField<CvData>
        name={`formations.${index}.degree`}
        label="Diplôme"
        register={register}
        errors={errors}
        placeholder="ex. Master en Informatique"
      />
      <FormField<CvData>
        name={`formations.${index}.school`}
        label="Établissement"
        register={register}
        errors={errors}
        placeholder="ex. Université Lyon 1"
      />
      <FormField<CvData>
        name={`formations.${index}.city`}
        label="Ville"
        register={register}
        errors={errors}
      />
      <div className="hidden sm:block" aria-hidden="true" />
      <MonthYearPicker<CvData>
        name={`formations.${index}.startDate`}
        label="Début"
        required
      />
      <MonthYearPicker<CvData>
        name={`formations.${index}.endDate`}
        label="Fin"
        allowPresent
      />
      <FormField<CvData>
        as="textarea"
        name={`formations.${index}.description`}
        label="Description"
        register={register}
        errors={errors}
        rows={3}
        hint="Spécialités, matières clés, mention…"
        className="sm:col-span-2"
      />
    </SectionCard>
  );
}
