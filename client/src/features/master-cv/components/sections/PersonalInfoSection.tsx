import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { createEmptyCv, type CvData, type MasterCvData } from "@cvie/shared";
import { PersonalInfoForm } from "../../../editor/components/PersonalInfoForm";

type PersonalInfo = MasterCvData["personalInfo"];

export function PersonalInfoSection({
  value,
  onChange,
}: {
  value: PersonalInfo;
  onChange: (next: PersonalInfo) => void;
}) {
  const form = useForm<CvData>({
    mode: "onChange",
    defaultValues: { ...createEmptyCv(), personalInfo: value },
  });
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // External → internal: re-seed personalInfo when value identity changes.
  useEffect(() => {
    form.reset(
      { ...form.getValues(), personalInfo: value },
      { keepDirty: false, keepErrors: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value is the upstream truth; ignore form
  }, [value]);

  // Internal → external: watch personalInfo and propagate.
  useEffect(() => {
    const sub = form.watch((data, { name }) => {
      if (!name?.startsWith("personalInfo")) return;
      const next = data.personalInfo as PersonalInfo | undefined;
      if (next) onChangeRef.current(next);
    });
    return () => sub.unsubscribe();
  }, [form]);

  return (
    <FormProvider {...form}>
      <PersonalInfoForm />
    </FormProvider>
  );
}
