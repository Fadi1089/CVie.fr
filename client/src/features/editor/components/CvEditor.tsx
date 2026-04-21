import { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useFormContext } from "react-hook-form";
import { Link, useSearchParams } from "react-router";
import {
  cvDataSchema,
  templateRegistry,
  type CvData,
  type OverflowMode,
  type TemplateId,
} from "@cvie/shared";
import { cn } from "@/lib/utils";
import { AutofillSyncContext, useAutofillSync } from "../hooks/useAutofillSync";
import { useCvDraft, type PersistStatus } from "../hooks/useCvDraft";
import {
  CV_SCALE_DEFAULT,
  CV_SCALE_MAX,
  CV_SCALE_MIN,
  CV_SCALE_STEP,
  useCvScale,
} from "../hooks/useCvScale";
import { useCvOverflowMode } from "../hooks/useCvOverflowMode";
import { OverflowModeSelector } from "./OverflowModeSelector";
import { EditorPreviewPane } from "./EditorPreviewPane";
import { ExperiencesSection } from "./ExperiencesSection";
import { FormationsSection } from "./FormationsSection";
import { InterestsSection } from "./InterestsSection";
import { LanguagesSection } from "./LanguagesSection";
import { CvImportButton } from "./CvImportButton";
import { CvResetButton } from "./CvResetButton";
import { MobileTabBar, type EditorTab } from "./MobileTabBar";
import { PersonalInfoForm } from "./PersonalInfoForm";
import { SkillsSection } from "./SkillsSection";

const TEMPLATE_SELECTION_KEY = "cvie.template.selected";
const DEFAULT_TEMPLATE: TemplateId = "classique";
const SAFE_FALLBACK_META = { id: DEFAULT_TEMPLATE, name: "Classique" } as const;
const EDITOR_SECTION_IDS = [
  "personalInfo",
  "formations",
  "experiences",
  "skills",
  "languages",
  "interests",
] as const;
type EditorSectionId = (typeof EDITOR_SECTION_IDS)[number];

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

  const { form, persistStatus, resetDraft } = useCvDraft();
  const { scale, setScale, resetScale } = useCvScale();
  const { overflowMode, setOverflowMode } = useCvOverflowMode();
  const [mobileTab, setMobileTab] = useState<EditorTab>("edit");
  const [unknownBannerDismissed, setUnknownBannerDismissed] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);

  const handleReset = () => {
    resetDraft();
    setResetNonce((n) => n + 1);
  };

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
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [form.formState.isDirty]);

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
        scale={scale}
        setScale={setScale}
        resetScale={resetScale}
        overflowMode={overflowMode}
        setOverflowMode={setOverflowMode}
        resetDraft={handleReset}
        resetNonce={resetNonce}
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
  scale: number;
  setScale: (next: number) => void;
  resetScale: () => void;
  overflowMode: OverflowMode;
  setOverflowMode: (next: OverflowMode) => void;
  resetDraft: () => void;
  resetNonce: number;
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
  scale,
  setScale,
  resetScale,
  overflowMode,
  setOverflowMode,
  resetDraft,
  resetNonce,
}: EditorShellProps) {
  const autofillSync = useAutofillSync<CvData>();
  const sectionRefs = useRef<Record<EditorSectionId, HTMLElement | null>>({
    personalInfo: null,
    formations: null,
    experiences: null,
    skills: null,
    languages: null,
    interests: null,
  });
  const highlightTimerRef = useRef<number | null>(null);
  const arrivalWaitRef = useRef<number>(0);
  const [highlightedSection, setHighlightedSection] = useState<EditorSectionId | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const setSectionRef = (id: EditorSectionId) => (node: HTMLElement | null) => {
    sectionRefs.current[id] = node;
  };

  const setItemRef = (itemId: string) => (node: HTMLElement | null) => {
    itemRefs.current[itemId] = node;
  };

  const handlePreviewSectionClick = ({
    sectionId: rawSectionId,
    itemId,
  }: {
    sectionId: string;
    itemId?: string;
  }) => {
    if (!EDITOR_SECTION_IDS.includes(rawSectionId as EditorSectionId)) return;
    const sectionId = rawSectionId as EditorSectionId;
    const target = itemId
      ? itemRefs.current[itemId] ?? sectionRefs.current[sectionId]
      : sectionRefs.current[sectionId];
    if (!target) return;
    const waitToken = ++arrivalWaitRef.current;

    const waitForArrival = (node: HTMLElement) =>
      new Promise<void>((resolve) => {
        const startedAt = performance.now();
        const timeoutMs = 1200;
        const thresholdPx = 24;

        const check = () => {
          if (waitToken !== arrivalWaitRef.current) {
            resolve();
            return;
          }
          const rect = node.getBoundingClientRect();
          const arrived = Math.abs(rect.top - 96) <= thresholdPx || rect.top >= 0;
          if (arrived || performance.now() - startedAt > timeoutMs) {
            resolve();
            return;
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });

    if (mobileTab === "preview") {
      setMobileTab("edit");
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
      });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    }

    void waitForArrival(target).then(() => {
      if (waitToken !== arrivalWaitRef.current) return;
      if (itemId) {
        setHighlightedSection(null);
        setHighlightedItemId(itemId);
      } else {
        setHighlightedItemId(null);
        setHighlightedSection(sectionId);
      }
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightedSection(null);
        setHighlightedItemId(null);
        highlightTimerRef.current = null;
      }, 1500);
    });
  };

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
          templateId={templateId}
          templateName={templateName}
          persistStatus={persistStatus}
          scale={scale}
          setScale={setScale}
          resetScale={resetScale}
          overflowMode={overflowMode}
          setOverflowMode={setOverflowMode}
          resetDraft={resetDraft}
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
              <FormSections
                highlightedSection={highlightedSection}
                highlightedItemId={highlightedItemId}
                setSectionRef={setSectionRef}
                setItemRef={setItemRef}
              />
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
                <EditorPreviewPane
                  templateId={templateId}
                  scale={scale}
                  overflowMode={overflowMode}
                  resetNonce={resetNonce}
                  onSectionClick={handlePreviewSectionClick}
                />
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

function FormSections({
  highlightedSection,
  highlightedItemId,
  setSectionRef,
  setItemRef,
}: {
  highlightedSection: EditorSectionId | null;
  highlightedItemId: string | null;
  setSectionRef: (id: EditorSectionId) => (node: HTMLElement | null) => void;
  setItemRef: (itemId: string) => (node: HTMLElement | null) => void;
}) {
  const sectionClass = (id: EditorSectionId) =>
    cn("scroll-mt-24 rounded-xl transition-colors", highlightedSection === id && "editor-jump-highlight");

  return (
    <div className="mx-auto flex max-w-[44rem] flex-col gap-10">
      <div ref={setSectionRef("personalInfo")} className={sectionClass("personalInfo")}>
        <PersonalInfoForm />
      </div>
      <div ref={setSectionRef("formations")} className={sectionClass("formations")}>
        <FormationsSection highlightedItemId={highlightedItemId} setItemRef={setItemRef} />
      </div>
      <div ref={setSectionRef("experiences")} className={sectionClass("experiences")}>
        <ExperiencesSection
          highlightedItemId={highlightedItemId}
          setItemRef={setItemRef}
        />
      </div>
      <div ref={setSectionRef("skills")} className={sectionClass("skills")}>
        <SkillsSection highlightedItemId={highlightedItemId} setItemRef={setItemRef} />
      </div>
      <div ref={setSectionRef("languages")} className={sectionClass("languages")}>
        <LanguagesSection highlightedItemId={highlightedItemId} setItemRef={setItemRef} />
      </div>
      <div ref={setSectionRef("interests")} className={sectionClass("interests")}>
        <InterestsSection highlightedItemId={highlightedItemId} setItemRef={setItemRef} />
      </div>
    </div>
  );
}

function EditorHeader({
  templateId,
  templateName,
  persistStatus,
  scale,
  setScale,
  resetScale,
  overflowMode,
  setOverflowMode,
  resetDraft,
}: {
  templateId: TemplateId;
  templateName: string;
  persistStatus: PersistStatus;
  scale: number;
  setScale: (next: number) => void;
  resetScale: () => void;
  overflowMode: OverflowMode;
  setOverflowMode: (next: OverflowMode) => void;
  resetDraft: () => void;
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
        <ScaleSlider scale={scale} setScale={setScale} resetScale={resetScale} />
        <OverflowModeSelector value={overflowMode} onChange={setOverflowMode} />
        <CvImportButton />
        <CvResetButton onReset={resetDraft} />
        <ExportPdfButton
          templateId={templateId}
          scale={scale}
          overflowMode={overflowMode}
        />
      </div>
    </header>
  );
}

function ScaleSlider({
  scale,
  setScale,
  resetScale,
}: {
  scale: number;
  setScale: (next: number) => void;
  resetScale: () => void;
}) {
  const percent = Math.round(scale * 100);
  const isDefault = Math.abs(scale - CV_SCALE_DEFAULT) < 0.001;
  return (
    <div
      className="hidden items-center gap-2 rounded-md border border-[var(--color-rule)] bg-white/70 px-2.5 py-1.5 md:inline-flex"
      role="group"
      aria-label="Densité du CV"
    >
      <span
        aria-hidden="true"
        className="font-mono-caps text-[10px] tracking-wider text-[var(--color-ink-soft)]"
      >
        Densité
      </span>
      <input
        type="range"
        min={CV_SCALE_MIN}
        max={CV_SCALE_MAX}
        step={CV_SCALE_STEP}
        value={scale}
        onChange={(e) => setScale(Number.parseFloat(e.target.value))}
        aria-label="Ajuster la densité d'affichage du CV"
        aria-valuetext={`${percent} pour cent`}
        className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-[var(--color-rule)] accent-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30"
      />
      <span className="font-mono-caps w-10 text-right text-[11px] tabular-nums text-[var(--color-ink)]">
        {percent}%
      </span>
      <button
        type="button"
        onClick={resetScale}
        disabled={isDefault}
        aria-label="Réinitialiser la densité"
        title="Réinitialiser la densité"
        className="inline-flex h-5 w-5 items-center justify-center rounded text-[13px] leading-none text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
      >
        ⟲
      </button>
    </div>
  );
}

type ExportStatus = "idle" | "pending" | "error";

function parseContentDispositionFilename(cd: string): string | null {
  const star = /filename\*=\s*([^'']+)''([^;]+)/i.exec(cd);
  if (star && star[2]) {
    try {
      return decodeURIComponent(star[2].trim());
    } catch {
      // fall through
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(cd);
  if (quoted?.[1]) return quoted[1];
  const unquoted = /filename=([^;]+)/i.exec(cd);
  if (unquoted?.[1]) return unquoted[1].trim();
  return null;
}

function ExportPdfButton({
  templateId,
  scale,
  overflowMode,
}: {
  templateId: TemplateId;
  scale: number;
  overflowMode: OverflowMode;
}) {
  const { getValues } = useFormContext<CvData>();
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

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
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/v1/cv/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, templateId, scale, overflowMode }),
        signal: controller.signal,
      });
      if (!res.ok) {
        let detail = "";
        try {
          const ct = res.headers.get("Content-Type") ?? "";
          if (ct.includes("application/json")) {
            const j = await res.json();
            detail = typeof j?.message === "string" ? j.message : JSON.stringify(j);
          } else {
            detail = await res.text();
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(detail ? `HTTP ${res.status}: ${detail}` : `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition") ?? "";
      const filename = parseContentDispositionFilename(contentDisposition) ?? "cv.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (mountedRef.current) setStatus("idle");
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      console.error("[ExportPdfButton] export failed:", err);
      if (!mountedRef.current) return;
      setStatus("error");
      const detail = err instanceof Error ? err.message : "";
      setErrorMessage(
        detail
          ? `Échec de l'export (${detail}). Réessayez dans un instant.`
          : "Échec de l'export. Réessayez dans un instant.",
      );
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
