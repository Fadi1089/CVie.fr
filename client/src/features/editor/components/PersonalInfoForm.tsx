import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import type { CvData } from "@cvie/shared";
import { FormField } from "./FormField";

const RESERVED_USERNAMES = new Set(["http", "https", "www", "api"]);

function detectSource(raw: string): "linkedin" | "github" | null {
  const v = raw.trim();
  if (!v) return null;
  if (/linkedin\.com/i.test(v)) return "linkedin";
  if (/github\.com/i.test(v)) return "github";
  if (/^[A-Za-z0-9](?:[A-Za-z0-9-]{1,38})$/.test(v)) {
    if (RESERVED_USERNAMES.has(v.toLowerCase())) return null;
    return "github";
  }
  return null;
}

export function PersonalInfoForm() {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<CvData>();
  const [extractValue, setExtractValue] = useState("");
  const [extractState, setExtractState] = useState<
    { status: "idle" } | { status: "loading" } | { status: "error"; message: string } | { status: "success" }
  >({ status: "idle" });
  const mountedRef = useRef(true);
  const requestGenRef = useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function handleExtract() {
    const source = detectSource(extractValue);
    if (!source) {
      setExtractState({
        status: "error",
        message: "Saisissez une URL LinkedIn ou un nom d'utilisateur GitHub.",
      });
      return;
    }
    const gen = ++requestGenRef.current;
    setExtractState({ status: "loading" });
    try {
      const res = await fetch(
        `/api/v1/avatar/${source}?value=${encodeURIComponent(extractValue.trim())}`,
      );
      const data = (await res.json()) as { url?: string; error?: string };
      if (!mountedRef.current || gen !== requestGenRef.current) return;
      if (!res.ok || !data.url) {
        setExtractState({
          status: "error",
          message: data.error ?? "Extraction impossible.",
        });
        return;
      }
      if (!/^(https:\/\/|data:image\/)/.test(data.url)) {
        setExtractState({ status: "error", message: "URL invalide" });
        return;
      }
      setValue("personalInfo.photoUrl", data.url, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setExtractState({ status: "success" });
    } catch {
      if (!mountedRef.current || gen !== requestGenRef.current) return;
      setExtractState({ status: "error", message: "Erreur réseau." });
    }
  }

  return (
    <section className="space-y-5">
      <header className="border-b border-[var(--color-rule)] pb-3">
        <h2 className="font-display text-[22px] font-medium text-[var(--color-ink)]">
          Informations personnelles
        </h2>
        <p className="mt-0.5 text-[13px] text-[var(--color-ink-soft)]">
          Prénom et nom obligatoires. La photo est facultative (loi du 27 mai
          2008 — non-discrimination).
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField<CvData>
          name="personalInfo.firstName"
          label="Prénom"
          register={register}
          errors={errors}
          required
          autoComplete="given-name"
          spellCheck={false}
        />
        <FormField<CvData>
          name="personalInfo.lastName"
          label="Nom"
          register={register}
          errors={errors}
          required
          autoComplete="family-name"
          spellCheck={false}
        />
        <FormField<CvData>
          name="personalInfo.jobTitle"
          label="Intitulé du poste visé"
          register={register}
          errors={errors}
          placeholder="ex. Développeuse Full-Stack — Alternance"
          autoComplete="organization-title"
          className="sm:col-span-2"
        />
        <FormField<CvData>
          as="textarea"
          name="personalInfo.summary"
          label="Résumé / accroche"
          register={register}
          errors={errors}
          rows={4}
          hint="Quelques lignes pour vous présenter (facultatif)."
          className="sm:col-span-2"
        />
        <FormField<CvData>
          name="personalInfo.email"
          type="email"
          label="Email"
          register={register}
          errors={errors}
          autoComplete="email"
          spellCheck={false}
        />
        <FormField<CvData>
          name="personalInfo.phone"
          type="tel"
          label="Téléphone"
          register={register}
          errors={errors}
          autoComplete="tel"
          spellCheck={false}
        />
        <FormField<CvData>
          name="personalInfo.city"
          label="Ville"
          register={register}
          errors={errors}
          autoComplete="address-level2"
        />
        <FormField<CvData>
          name="personalInfo.linkedinUrl"
          type="url"
          label="LinkedIn"
          register={register}
          errors={errors}
          placeholder="https://linkedin.com/in/…"
          spellCheck={false}
        />
        <FormField<CvData>
          name="personalInfo.portfolioUrl"
          type="url"
          label="Portfolio"
          register={register}
          errors={errors}
          placeholder="https://…"
          className="sm:col-span-2"
          spellCheck={false}
        />
        <FormField<CvData>
          name="personalInfo.photoUrl"
          type="url"
          label="URL de la photo (facultatif)"
          register={register}
          errors={errors}
          hint="Légalement facultatif en France. http(s) ou data:image."
          className="sm:col-span-2"
          spellCheck={false}
        />
        <div className="sm:col-span-2 rounded-md border border-dashed border-[var(--color-rule)] bg-[var(--color-paper-deep)]/40 p-3">
          <p className="text-[12px] font-medium text-[var(--color-ink)]">
            Extraire depuis LinkedIn ou GitHub
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-ink-soft)]">
            URL LinkedIn (https://linkedin.com/in/…) ou nom d'utilisateur GitHub.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={extractValue}
              onChange={(e) => {
                setExtractValue(e.target.value);
                if (extractState.status !== "idle")
                  setExtractState({ status: "idle" });
              }}
              placeholder="linkedin.com/in/jdupont ou jdupont"
              spellCheck={false}
              className="block min-h-11 flex-1 rounded-md border border-[var(--color-ink)]/15 bg-white px-3 py-2 text-[14px] leading-6 text-[var(--color-ink)] outline-none focus-visible:border-[var(--color-ink)] focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/20"
            />
            <button
              type="button"
              onClick={handleExtract}
              disabled={extractState.status === "loading" || !extractValue.trim()}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--color-ink)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[var(--color-ink)]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {extractState.status === "loading" ? "Extraction…" : "Extraire"}
            </button>
          </div>
          {extractState.status === "error" ? (
            <p className="mt-2 text-[12px] text-red-700">{extractState.message}</p>
          ) : null}
          {extractState.status === "success" ? (
            <p className="mt-2 text-[12px] text-emerald-700">
              Photo extraite — URL appliquée ci-dessus.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
