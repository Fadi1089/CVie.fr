import { useCallback, useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { createEmptyCv, type CvData } from "@cvie/shared";
import { InterestsSection as BaseInterestsSection } from "../../../editor/components/InterestsSection";

type Interest = CvData["interests"][number];

export function InterestsSection({
  value,
  onChange,
}: {
  value: Interest[];
  onChange: (next: Interest[]) => void;
}) {
  const form = useForm<CvData>({
    mode: "onChange",
    defaultValues: { ...createEmptyCv(), interests: value },
  });

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const lastEmittedRef = useRef<Interest[]>(value);

  const emit = useCallback((next: Interest[]) => {
    lastEmittedRef.current = next;
    onChangeRef.current(next);
  }, []);

  // External → internal
  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    form.reset(
      { ...form.getValues(), interests: value },
      { keepDirty: false, keepErrors: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value is the upstream truth; ignore form
  }, [value]);

  // Internal → external
  useEffect(() => {
    const sub = form.watch((data, { name }) => {
      if (!name?.startsWith("interests")) return;
      const next = (data.interests ?? []) as Interest[];
      emit(next);
    });
    return () => sub.unsubscribe();
  }, [form, emit]);

  return (
    <section className="mt-8">
      <FormProvider {...form}>
        <BaseInterestsSection />
      </FormProvider>
    </section>
  );
}
