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

const MAX_EXPERIENCES = 50;

export function ExperiencesSection({
  highlightedItemId,
  setItemRef,
}: {
  highlightedItemId?: string | null;
  setItemRef?: (itemId: string) => (node: HTMLElement | null) => void;
}) {
  const { control } = useFormContext<CvData>();
  const { fields, append, remove } = useFieldArray<CvData, "experiences", "rhfId">({
    control,
    name: "experiences",
    keyName: "rhfId",
  });
  const atCap = fields.length >= MAX_EXPERIENCES;
  const { containerRef, fallbackRef, focusAfterRemove } = useFocusAfterRemove();
  const pendingRemoved = usePendingRemovedItems("experiences");

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
      <PendingAddMarker section="experiences" id={field.id}>
        <ExperienceCard
          index={index}
          onRemove={() => {
            remove(index);
            focusAfterRemove(index);
          }}
        />
      </PendingAddMarker>
    </div>
  ));

  // Interleave ghost rows for AI-removed items at their original index so
  // the user can see what was dropped without having to dig through chat.
  const rows: React.ReactNode[] = [...realRows];
  for (const ghost of pendingRemoved) {
    const pos = Math.min(Math.max(ghost.originalIndex, 0), rows.length);
    const title = String(ghost.item.jobTitle ?? "Expérience");
    const company = ghost.item.company ? String(ghost.item.company) : undefined;
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
          sublabel={company}
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
        title="Expériences professionnelles"
        description="Stages, emplois, missions. Les points clés de chaque poste tiennent en une ligne."
        count={fields.length}
        addLabel="Ajouter une expérience"
        disabled={atCap}
        disabledReason={atCap ? `Maximum ${MAX_EXPERIENCES} entrées atteint` : undefined}
        onAdd={() =>
          append({
            id: newId(),
            jobTitle: "",
            company: "",
            startDate: "",
            bullets: [],
          })
        }
      >
        {rows}
      </SectionShell>
    </div>
  );
}

function ExperienceCard({
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

  const jobTitle = useWatch({ control, name: `experiences.${index}.jobTitle` });
  const company = useWatch({ control, name: `experiences.${index}.company` });

  return (
    <SectionCard
      title={jobTitle?.trim() || "Nouvelle expérience"}
      subtitle={company?.trim() || undefined}
      index={index}
      onRemove={onRemove}
    >
      <FormField<CvData>
        name={`experiences.${index}.jobTitle`}
        label="Intitulé du poste"
        register={register}
        errors={errors}
        placeholder="ex. Développeuse Full-Stack"
      />
      <FormField<CvData>
        name={`experiences.${index}.company`}
        label="Entreprise"
        register={register}
        errors={errors}
      />
      <FormField<CvData>
        name={`experiences.${index}.city`}
        label="Ville"
        register={register}
        errors={errors}
      />
      <div className="hidden sm:block" aria-hidden="true" />
      <MonthYearPicker<CvData>
        name={`experiences.${index}.startDate`}
        label="Début"
        required
      />
      <MonthYearPicker<CvData>
        name={`experiences.${index}.endDate`}
        label="Fin"
        allowPresent
      />

      <FormField<CvData>
        as="textarea"
        name={`experiences.${index}.description`}
        label="Description"
        register={register}
        errors={errors}
        rows={5}
        hint="Une ligne commençant par « - » devient un point clé. Les autres lignes restent en texte."
        className="sm:col-span-2"
      />
    </SectionCard>
  );
}
