import { useEffect, useMemo, useState } from "react";
import { FormProvider, useFormContext } from "react-hook-form";
import { Link, useSearchParams } from "react-router";
import { cvDataSchema, templateRegistry, type CvData, type TemplateId } from "@cvie/shared";
import { cn } from "@/lib/utils";
import { AutofillSyncContext, useAutofillSync } from "../hooks/useAutofillSync";
import { useCvDraft, type PersistStatus } from "../hooks/useCvDraft";
import { EditorPreviewPane } from "./EditorPreviewPane";
import { ExperiencesSection } from "./ExperiencesSection";
import { FormationsSection } from "./FormationsSection";
import { InterestsSection } from "./InterestsSection";
import { LanguagesSection } from "./LanguagesSection";
import { CvImportButton } from "./CvImportButton";
import { MobileTabBar, type EditorTab } from "./MobileTabBar";
import { PersonalInfoForm } from "./PersonalInfoForm";
import { SkillsSection } from "./SkillsSection";

const TEMPLATE_SELECTION_KEY = "cvie.template.selected";
const DEFAULT_TEMPLATE: TemplateId = "classique";
const SAFE_FALLBACK_META = { id: DEFAULT_TEMPLATE, name: "Classique" } as const;

function Spinner({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn(
        "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/25 border-t-current",
        className,
      )}
    />
  );
}

function firstValidationMessage(values: CvData): string {
  const parsed = cvDataSchema.safeParse(values);
  if (parsed.success) return "";
  return parsed.error.issues[0]?.message ?? "Vérifiez les champs du CV.";
}

/**
 * Resolves the active template id per AC1:
 *   1. `?template=<id>` query param (if valid)
 *   2. `localStorage["cvie.template.selected"]` (if valid)
 *   3. `"classique"` fallback
 * Returns the resolved id plus a flag indicating whether the caller passed
 * an unknown `?template=` value (so the UI can surface a banner instead of
 * silently overriding user intent).
 */
function resolveTemplateId(queryParam: string | null): {
  id: TemplateId;
  unknownQuery: boolean;
} {
  const known = new Set(templateRegistry.map((t) => t.id));
  if (queryParam && known.has(queryParam as TemplateId)) {
    return { id: queryParam as TemplateId, unknownQuery: false };
  }
  const unknownQuery = queryParam !== null && queryParam.length > 0;
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(TEMPLATE_SELECTION_KEY);
      if (stored && known.has(stored as TemplateId)) {
        return { id: stored as TemplateId, unknownQuery };
      }
    } catch {
      // ignore storage access issues
    }
  }
  return { id: DEFAULT_TEMPLATE, unknownQuery };
}

export function CvEditor() {
  const [params] = useSearchParams();
  const { id: templateId, unknownQuery } = useMemo(
    () => resolveTemplateId(params.get("template")),
    [params],
  );
  const templateMeta =
    templateRegistry.find((t) => t.id === templateId) ??
    templateRegistry[0] ??
    SAFE_FALLBACK_META;

  const { form, persistStatus } = useCvDraft();
  const [mobileTab, setMobileTab] = useState<EditorTab>("edit");
  const [unknownBannerDismissed, setUnknownBannerDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => {
      if (!e.matches) setMobileTab("edit");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function beforeUnload(e: BeforeUnloadEvent) {
      if (!form.formState.isDirty) return;
      if (form.formState.isValid) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [form.formState.isDirty, form.formState.isValid]);

  return (
    <FormProvider {...form}>
      <EditorShell
        templateId={templateId}
        templateName={templateMeta.name}
        persistStatus={persistStatus}
        unknownQuery={unknownQuery}
        unknownBannerDismissed={unknownBannerDismissed}
        onDismissUnknownBanner={() => setUnknownBannerDismissed(true)}
        mobileTab={mobileTab}
        setMobileTab={setMobileTab}
      />
    </FormProvider>
  );
}

type EditorShellProps = {
  templateId: TemplateId;
  templateName: string;
  persistStatus: PersistStatus;
  unknownQuery: boolean;
  unknownBannerDismissed: boolean;
  onDismissUnknownBanner: () => void;
  mobileTab: EditorTab;
  setMobileTab: (t: EditorTab) => void;
};

function EditorShell({
  templateId,
  templateName,
  persistStatus,
  unknownQuery,
  unknownBannerDismissed,
  onDismissUnknownBanner,
  mobileTab,
  setMobileTab,
}: EditorShellProps) {
  const autofillSync = useAutofillSync<CvData>();

  return (
    <AutofillSyncContext.Provider value={autofillSync}>
      <div
        ref={(node) => {
          autofillSync.formRef.current = node;
        }}
        onBlurCapture={autofillSync.onBlurCapture}
        className="atelier-paper min-h-screen text-[var(--color-ink)]"
      >
        <EditorHeader
          templateName={templateName}
          persistStatus={persistStatus}
        />

        {unknownQuery && !unknownBannerDismissed ? (
          <UnknownTemplateBanner
            fallbackName={templateName}
            onDismiss={onDismissUnknownBanner}
          />
        ) : null}

        <div className="md:grid md:grid-cols-[minmax(480px,1fr)_minmax(420px,1fr)]">
          <section
            role="tabpanel"
            id="editor-panel-edit"
            aria-labelledby="editor-tab-edit"
            className={cn("md:block", mobileTab === "preview" ? "hidden" : "block")}
          >
            <form
              noValidate
              onSubmit={(e) => e.preventDefault()}
              className="px-4 pt-4 pb-24 md:h-[calc(100vh-64px)] md:overflow-y-auto md:border-r md:border-[var(--color-rule)] md:px-8 md:py-8"
              aria-label="Formulaire CV"
            >
              <FormSections />
            </form>
          </section>

          <section
            role="tabpanel"
            id="editor-panel-preview"
            aria-labelledby="editor-tab-preview"
            className={cn("md:block", mobileTab === "edit" ? "hidden" : "block")}
          >
            <aside
              className="px-4 pt-4 pb-24 md:sticky md:top-[64px] md:h-[calc(100vh-64px)] md:overflow-hidden md:px-0 md:pt-0 md:pb-0"
              aria-label="Aperçu du CV"
            >
              <div className="h-[calc(100vh-140px)] overflow-hidden rounded-md border border-[var(--color-rule)] bg-white md:h-full md:rounded-none md:border-0 md:bg-transparent">
                <EditorPreviewPane templateId={templateId} />
              </div>
            </aside>
          </section>
        </div>

        <div className="md:hidden">
          <MobileTabBar active={mobileTab} onChange={setMobileTab} />
        </div>
      </div>
    </AutofillSyncContext.Provider>
  );
}

function FormSections() {
  return (
    <div className="mx-auto flex max-w-[44rem] flex-col gap-10">
      <PersonalInfoForm />
      <FormationsSection />
      <ExperiencesSection />
      <SkillsSection />
      <LanguagesSection />
      <InterestsSection />
    </div>
  );
}

function EditorHeader({
  templateName,
  persistStatus,
}: {
  templateName: string;
  persistStatus: PersistStatus;
}) {
  const persistText =
    persistStatus === "failed"
      ? "⚠ Sauvegarde locale en échec"
      : "Brouillon enregistré localement";
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[var(--color-rule)] bg-[var(--color-paper)]/85 px-6 backdrop-blur">
      <div className="flex min-w-0 items-baseline gap-3">
        <Link
          to="/templates"
          className="text-[13px] font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 motion-reduce:transition-none"
        >
          ← Retour aux templates
        </Link>
        <span aria-hidden="true" className="text-[var(--color-ink-soft)]/40">
          /
        </span>
        <h1 className="font-display truncate text-[18px] font-medium text-[var(--color-ink)]">
          Éditeur · {templateName}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "font-mono-caps hidden text-[10px] sm:block",
            persistStatus === "failed"
              ? "text-red-700"
              : "text-[var(--color-ink-soft)]",
          )}
          role={persistStatus === "failed" ? "alert" : undefined}
        >
          {persistText}
        </span>
        <CvImportButton />
        <ExportPdfButton />
      </div>
    </header>
  );
}

type ExportStatus = "idle" | "pending" | "error";

function ExportPdfButton() {
  const { getValues } = useFormContext<CvData>();
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleExport() {
    const values = getValues();
    const parsed = cvDataSchema.safeParse(values);
    if (!parsed.success) {
      setStatus("error");
      setErrorMessage(firstValidationMessage(values));
      return;
    }
    setStatus("pending");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/v1/cv/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = /filename="([^"]+)"/.exec(contentDisposition);
      const filename = filenameMatch?.[1] ?? "cv.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch (err) {
      console.error("[ExportPdfButton] export failed:", err);
      setStatus("error");
      setErrorMessage("Échec de l'export. Réessayez dans un instant.");
    }
  }

  const isPending = status === "pending";
  const label = isPending ? "Export en cours…" : "Exporter en PDF";

  return (
    <div className="flex items-center gap-2">
      {errorMessage ? (
        <span role="alert" className="max-w-[18rem] text-[11px] text-red-700">
          {errorMessage}
        </span>
      ) : null}
      <button
        type="button"
        onClick={handleExport}
        disabled={isPending}
        className={cn(
          "inline-flex min-h-9 items-center gap-2 rounded-md bg-[var(--color-ink)] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[var(--color-ink)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none",
        )}
      >
        {isPending ? <Spinner className="h-3 w-3 border-white/30 border-t-white" /> : null}
        {label}
      </button>
    </div>
  );
}

function UnknownTemplateBanner({
  fallbackName,
  onDismiss,
}: {
  fallbackName: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="flex items-start justify-between gap-3 border-b border-amber-500/30 bg-amber-50 px-6 py-3 text-[12px] text-amber-900"
    >
      <p>
        Modèle inconnu — ouverture du modèle « {fallbackName} » à la place.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Masquer le message"
        className="text-amber-900/70 transition-colors hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/40 motion-reduce:transition-none"
      >
        ✕
      </button>
    </div>
  );
}
