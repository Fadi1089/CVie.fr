import { useCallback, useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { createEmptyCv, type CvData } from "@cvie/shared";
import { LanguagesSection as BaseLanguagesSection } from "../../../editor/components/LanguagesSection";

type Language = CvData["languages"][number];

export function LanguagesSection({
  value,
  onChange,
}: {
  value: Language[];
  onChange: (next: Language[]) => void;
}) {
  const form = useForm<CvData>({
    mode: "onChange",
    defaultValues: { ...createEmptyCv(), languages: value },
  });

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const lastEmittedRef = useRef<Language[]>(value);

  const emit = useCallback((next: Language[]) => {
    lastEmittedRef.current = next;
    onChangeRef.current(next);
  }, []);

  // External → internal
  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    form.reset(
      { ...form.getValues(), languages: value },
      { keepDirty: false, keepErrors: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value is the upstream truth; ignore form
  }, [value]);

  // Internal → external
  useEffect(() => {
    const sub = form.watch((data, { name }) => {
      if (!name?.startsWith("languages")) return;
      const next = (data.languages ?? []) as Language[];
      emit(next);
    });
    return () => sub.unsubscribe();
  }, [form, emit]);

  return (
    <section className="mt-8">
      <FormProvider {...form}>
        <BaseLanguagesSection />
      </FormProvider>
    </section>
  );
}
