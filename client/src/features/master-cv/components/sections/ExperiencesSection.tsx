import { useCallback, useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { createEmptyCv, type CvData, type MasterExperience } from "@cvie/shared";
import { ExperiencesSection as BaseExperiencesSection } from "../../../editor/components/ExperiencesSection";
import { TagsInput } from "../TagsInput";

type InnerExperience = CvData["experiences"][number];

const MAX_ACHIEVEMENTS = 30;

function stripExtras(list: MasterExperience[]): InnerExperience[] {
  return list.map((e) => {
    const { achievements: _a, tags: _t, ...rest } = e;
    return rest as InnerExperience;
  });
}

function mergeFromInner(
  inner: InnerExperience[],
  prev: MasterExperience[],
): MasterExperience[] {
  const byId = new Map<string, MasterExperience>();
  for (const p of prev) byId.set(p.id, p);
  return inner.map((entry) => {
    const existing = byId.get(entry.id);
    if (existing) {
      return {
        ...entry,
        achievements: existing.achievements,
        tags: existing.tags,
      } as MasterExperience;
    }
    return { ...entry, achievements: [], tags: [] } as MasterExperience;
  });
}

export function ExperiencesSection({
  value,
  onChange,
}: {
  value: MasterExperience[];
  onChange: (next: MasterExperience[]) => void;
}) {
  const form = useForm<CvData>({
    mode: "onChange",
    defaultValues: { ...createEmptyCv(), experiences: stripExtras(value) },
  });
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const lastEmittedRef = useRef<MasterExperience[]>(value);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Single canonical sink for parent updates: record what we emit so the
  // [value] effect below can skip the redundant form.reset when the parent
  // round-trips back the same reference.
  const emit = useCallback((next: MasterExperience[]) => {
    lastEmittedRef.current = next;
    onChangeRef.current(next);
  }, []);

  // External → internal: re-seed experiences when value identity changes,
  // but skip when the new value is the same reference we just emitted.
  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    form.reset(
      { ...form.getValues(), experiences: stripExtras(value) },
      { keepDirty: false, keepErrors: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value is the upstream truth; ignore form
  }, [value]);

  // Internal → external: watch experiences and propagate, preserving extras.
  useEffect(() => {
    const sub = form.watch((data, { name }) => {
      if (!name?.startsWith("experiences")) return;
      const inner = (data.experiences ?? []) as InnerExperience[];
      const next = mergeFromInner(inner, valueRef.current);
      emit(next);
    });
    return () => sub.unsubscribe();
  }, [form, emit]);

  const updateEntry = (id: string, patch: Partial<MasterExperience>) => {
    emit(value.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const addAchievement = (id: string) => {
    const entry = value.find((e) => e.id === id);
    if (!entry) return;
    if (entry.achievements.length >= MAX_ACHIEVEMENTS) return;
    updateEntry(id, { achievements: [...entry.achievements, ""] });
  };

  const updateAchievement = (id: string, idx: number, text: string) => {
    const entry = value.find((e) => e.id === id);
    if (!entry) return;
    const next = entry.achievements.map((a, i) => (i === idx ? text : a));
    updateEntry(id, { achievements: next });
  };

  const removeAchievement = (id: string, idx: number) => {
    const entry = value.find((e) => e.id === id);
    if (!entry) return;
    updateEntry(id, {
      achievements: entry.achievements.filter((_, i) => i !== idx),
    });
  };

  return (
    <section className="mt-8">
      <FormProvider {...form}>
        <BaseExperiencesSection />
      </FormProvider>

      {value.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {value.map((e) => {
            const atCap = e.achievements.length >= MAX_ACHIEVEMENTS;
            return (
              <li
                key={e.id}
                className="rounded-lg border border-[var(--color-rule)] p-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-mono-caps text-[10px] tracking-[0.18em]">
                    RÉALISATIONS ({e.achievements.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => addAchievement(e.id)}
                    disabled={atCap}
                    className="text-xs underline disabled:opacity-40"
                  >
                    + Réalisation
                  </button>
                </div>
                {e.achievements.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {e.achievements.map((a, idx) => (
                      <li
                        key={`${e.id}-${idx}`}
                        className="flex items-center gap-2"
                      >
                        <input
                          value={a}
                          maxLength={2000}
                          onChange={(ev) =>
                            updateAchievement(e.id, idx, ev.target.value)
                          }
                          className="flex-1 rounded border border-[var(--color-rule)] px-2 py-1 text-sm outline-none"
                          placeholder="Une réalisation mesurable…"
                        />
                        <button
                          type="button"
                          onClick={() => removeAchievement(e.id, idx)}
                          aria-label="Retirer la réalisation"
                          className="text-xs text-red-600"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3">
                  <h4 className="font-mono-caps text-[10px] tracking-[0.18em]">
                    TAGS
                  </h4>
                  <div className="mt-1">
                    <TagsInput
                      value={e.tags}
                      onChange={(tags) => updateEntry(e.id, { tags })}
                      max={20}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
