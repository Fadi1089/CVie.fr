import { useFormContext, Controller } from "react-hook-form";
import { TextInput } from "./_atoms/TextInput";
import { TextArea } from "./_atoms/TextArea";
import { Marginalia } from "./_atoms/Marginalia";

export function PersonalInfoForm() {
  const { control, formState: { errors } } = useFormContext();
  const e = errors.personalInfo as Record<string, { message?: string } | undefined> | undefined;

  return (
    <fieldset className="grid gap-4 max-w-[640px]">
      <legend className="sr-only">Informations personnelles</legend>

      <div className="grid grid-cols-2 gap-x-8">
        <Controller
          control={control}
          name="personalInfo.firstName"
          render={({ field }) => (
            <TextInput
              value={field.value ?? ""}
              onChange={field.onChange}
              label="Prénom"
              error={e?.firstName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="personalInfo.lastName"
          render={({ field }) => (
            <TextInput
              value={field.value ?? ""}
              onChange={field.onChange}
              label="Nom"
              error={e?.lastName?.message}
            />
          )}
        />
      </div>

      <Controller
        control={control}
        name="personalInfo.jobTitle"
        render={({ field }) => (
          <TextInput value={field.value ?? ""} onChange={field.onChange} label="Intitulé" />
        )}
      />

      <Controller
        control={control}
        name="personalInfo.summary"
        render={({ field }) => (
          <TextArea value={field.value ?? ""} onChange={field.onChange} label="Résumé professionnel" rows={4} />
        )}
      />

      <div className="grid grid-cols-2 gap-x-8">
        <Controller
          control={control}
          name="personalInfo.email"
          render={({ field }) => (
            <TextInput value={field.value ?? ""} onChange={field.onChange} label="E-mail" error={e?.email?.message} />
          )}
        />
        <Controller
          control={control}
          name="personalInfo.phone"
          render={({ field }) => (
            <TextInput value={field.value ?? ""} onChange={field.onChange} label="Téléphone" />
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-8">
        <Controller
          control={control}
          name="personalInfo.city"
          render={({ field }) => (
            <TextInput value={field.value ?? ""} onChange={field.onChange} label="Ville" />
          )}
        />
        <Controller
          control={control}
          name="personalInfo.linkedinUrl"
          render={({ field, fieldState }) => (
            <TextInput
              value={field.value ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              label="LinkedIn"
              error={fieldState.error?.message ?? e?.linkedinUrl?.message}
            />
          )}
        />
      </div>

      <Controller
        control={control}
        name="personalInfo.portfolioUrl"
        render={({ field }) => (
          <TextInput value={field.value ?? ""} onChange={field.onChange} label="Portfolio" />
        )}
      />

      <Marginalia kind="info">La photo est facultative en France (loi du 27 mai 2008).</Marginalia>
    </fieldset>
  );
}
