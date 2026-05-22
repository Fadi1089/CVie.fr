import { useCallback, useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { createEmptyCv, type CvData, type MasterFormation } from "@cvie/shared";
import { FormationsSection as BaseFormationsSection } from "../../../editor/components/FormationsSection";
import { TagsInput } from "../TagsInput";

type InnerFormation = CvData["formations"][number];

function stripExtras(list: MasterFormation[]): InnerFormation[] {
  return list.map((f) => {
    const { tags: _t, ...rest } = f;
    return rest as InnerFormation;
  });
}

function mergeFromInner(
  inner: InnerFormation[],
  prev: MasterFormation[],
): MasterFormation[] {
  const byId = new Map<string, MasterFormation>();
  for (const p of prev) byId.set(p.id, p);
  return inner.map((entry) => {
    const existing = byId.get(entry.id);
    if (existing) {
      return {
        ...entry,
        tags: existing.tags,
      } as MasterFormation;
    }
    return { ...entry, tags: [] } as MasterFormation;
  });
}

export function FormationsSection({
  value,
  onChange,
}: {
  value: MasterFormation[];
  onChange: (next: MasterFormation[]) => void;
}) {
  const form = useForm<CvData>({
    mode: "onChange",
    defaultValues: { ...createEmptyCv(), formations: stripExtras(value) },
  });
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const lastEmittedRef = useRef<MasterFormation[]>(value);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Single canonical sink for parent updates: record what we emit so the
  // [value] effect below can skip the redundant form.reset when the parent
  // round-trips back the same reference.
  const emit = useCallback((next: MasterFormation[]) => {
    lastEmittedRef.current = next;
    onChangeRef.current(next);
  }, []);

  // External → internal: re-seed formations when value identity changes,
  // but skip when the new value is the same reference we just emitted.
  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    form.reset(
      { ...form.getValues(), formations: stripExtras(value) },
      { keepDirty: false, keepErrors: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value is the upstream truth; ignore form
  }, [value]);

  // Internal → external: watch formations and propagate, preserving extras.
  useEffect(() => {
    const sub = form.watch((data, { name }) => {
      if (!name?.startsWith("formations")) return;
      const inner = (data.formations ?? []) as InnerFormation[];
      const next = mergeFromInner(inner, valueRef.current);
      emit(next);
    });
    return () => sub.unsubscribe();
  }, [form, emit]);

  const updateEntry = (id: string, patch: Partial<MasterFormation>) => {
    emit(value.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  return (
    <section className="mt-8">
      <FormProvider {...form}>
        <BaseFormationsSection />
      </FormProvider>

      {value.length > 0 && (
        <ul className="mt-2 flex flex-col gap-3">
          {value.map((f) => (
            <li
              key={f.id}
              className="rounded-lg border border-[var(--color-rule)] p-3"
            >
              <p className="font-mono-caps text-[10px] tracking-[0.18em]">TAGS</p>
              <div className="mt-2">
                <TagsInput
                  value={f.tags}
                  onChange={(tags) => updateEntry(f.id, { tags })}
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
