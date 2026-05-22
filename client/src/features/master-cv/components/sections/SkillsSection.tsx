import { useCallback, useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { createEmptyCv, type CvData, type MasterSkill } from "@cvie/shared";
import { SkillsSection as BaseSkillsSection } from "../../../editor/components/SkillsSection";
import { TagsInput } from "../TagsInput";

type InnerSkill = CvData["skills"][number];

function stripExtras(list: MasterSkill[]): InnerSkill[] {
  return list.map((s) => {
    const { tags: _t, ...rest } = s;
    return rest as InnerSkill;
  });
}

function mergeFromInner(
  inner: InnerSkill[],
  prev: MasterSkill[],
): MasterSkill[] {
  const byId = new Map<string, MasterSkill>();
  for (const p of prev) byId.set(p.id, p);
  return inner.map((entry) => {
    const existing = byId.get(entry.id);
    if (existing) {
      return {
        ...entry,
        tags: existing.tags,
      } as MasterSkill;
    }
    return { ...entry, tags: [] } as MasterSkill;
  });
}

export function SkillsSection({
  value,
  onChange,
}: {
  value: MasterSkill[];
  onChange: (next: MasterSkill[]) => void;
}) {
  const form = useForm<CvData>({
    mode: "onChange",
    defaultValues: { ...createEmptyCv(), skills: stripExtras(value) },
  });
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const lastEmittedRef = useRef<MasterSkill[]>(value);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Single canonical sink for parent updates: record what we emit so the
  // [value] effect below can skip the redundant form.reset when the parent
  // round-trips back the same reference.
  const emit = useCallback((next: MasterSkill[]) => {
    lastEmittedRef.current = next;
    onChangeRef.current(next);
  }, []);

  // External → internal: re-seed skills when value identity changes,
  // but skip when the new value is the same reference we just emitted.
  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    form.reset(
      { ...form.getValues(), skills: stripExtras(value) },
      { keepDirty: false, keepErrors: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value is the upstream truth; ignore form
  }, [value]);

  // Internal → external: watch skills and propagate, preserving extras.
  useEffect(() => {
    const sub = form.watch((data, { name }) => {
      if (!name?.startsWith("skills")) return;
      const inner = (data.skills ?? []) as InnerSkill[];
      const next = mergeFromInner(inner, valueRef.current);
      emit(next);
    });
    return () => sub.unsubscribe();
  }, [form, emit]);

  const updateEntry = (id: string, patch: Partial<MasterSkill>) => {
    emit(value.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  return (
    <section className="mt-8">
      <FormProvider {...form}>
        <BaseSkillsSection />
      </FormProvider>

      {value.length > 0 && (
        <ul className="mt-2 flex flex-col gap-3">
          {value.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-[var(--color-rule)] p-3"
            >
              <p className="font-mono-caps text-[10px] tracking-[0.18em]">TAGS</p>
              <div className="mt-2">
                <TagsInput
                  value={s.tags}
                  onChange={(tags) => updateEntry(s.id, { tags })}
                  max={20}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
