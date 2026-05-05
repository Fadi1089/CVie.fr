import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useFormContext } from "react-hook-form";
import { useSearchParams } from "react-router";
import {
  cvDataSchema,
  templateRegistry,
  type CvData,
  type OverflowMode,
  type TemplateId,
} from "@cvie/shared";
import { cn } from "@/lib/utils";
import {
  readCvLibrary,
  upsertCvRecord,
  type CvLibraryRecord,
} from "@/features/cv-library/storage";
import { EditorSidebar, useSidebarCollapsed } from "./EditorSidebar";
import { EditorSplitter } from "./EditorSplitter";
import { useEditorSplit } from "../hooks/useEditorSplit";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AutofillSyncContext, useAutofillSync } from "../hooks/useAutofillSync";
import { useCvDraft, type PersistStatus } from "../hooks/useCvDraft";
import { useAuth0 } from "@auth0/auth0-react";
import { SyncStatusBadge } from "@/features/cv-library/components/SyncStatusBadge";
import type { SyncStatus } from "@/features/cv-library/store/types";
import {
  CV_SCALE_DEFAULT,
  CV_SCALE_MAX,
  CV_SCALE_MIN,
  CV_SCALE_STEP,
  useCvScale,
} from "../hooks/useCvScale";
import { useCvOverflowMode } from "../hooks/useCvOverflowMode";
import { EditorPreviewPane } from "./EditorPreviewPane";
import { ExperiencesSection } from "./ExperiencesSection";
import { FormationsSection } from "./FormationsSection";
import { InterestsSection } from "./InterestsSection";
import { LanguagesSection } from "./LanguagesSection";
import { CvImportButton } from "./CvImportButton";
import { CvResetButton } from "./CvResetButton";
import { DesignPanel } from "./DesignPanel";
import { EditorTabs, type EditorTabKey } from "./EditorTabs";
import { LanguagePanel } from "./LanguagePanel";
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
  const [params, setParams] = useSearchParams();
  const cvId = params.get("cv")?.trim() ?? "";
  const { id: templateId, unknownQuery } = useMemo(
    () => resolveTemplateId(params.get("template")),
    [params],
  );
  const templateMeta =
    templateRegistry.find((t) => t.id === templateId) ??
    templateRegistry[0] ??
    SAFE_FALLBACK_META;

  const [cvRecord, setCvRecord] = useState<CvLibraryRecord | null>(null);
  const [cvTitleInput, setCvTitleInput] = useState("Nouveau CV");
  const handleDraftPersisted = useCallback(() => {
    if (!cvId) return;
    upsertCvRecord(cvId, {});
  }, [cvId]);
  const { form, persistStatus, resetDraft } = useCvDraft(cvId, {
    onPersisted: handleDraftPersisted,
  });
  const { scale, setScale, resetScale } = useCvScale();
  const { overflowMode, setOverflowMode } = useCvOverflowMode();
  const [mobileTab, setMobileTab] = useState<EditorTab>("edit");
  const [unknownBannerDismissed, setUnknownBannerDismissed] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useSidebarCollapsed();

  useEffect(() => {
    if (!cvId) return;
    const existing = readCvLibrary().find((record) => record.id === cvId) ?? null;
    const ensured =
      existing ??
      upsertCvRecord(cvId, {
        title: "Nouveau CV",
        templateId,
      });
    setCvRecord(ensured);
  }, [cvId, templateId]);

  useEffect(() => {
    setCvTitleInput(cvRecord?.title ?? "Nouveau CV");
  }, [cvRecord?.id, cvRecord?.title]);

  const handleReset = () => {
    resetDraft();
    setResetNonce((n) => n + 1);
  };

  const handleTemplateChange = (nextTemplateId: TemplateId) => {
    try {
      window.localStorage.setItem(TEMPLATE_SELECTION_KEY, nextTemplateId);
    } catch {
      // ignore storage access issues
    }
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("template", nextTemplateId);
      return next;
    });
    if (cvId) {
      const updated = upsertCvRecord(cvId, { templateId: nextTemplateId });
      setCvRecord(updated);
    }
  };

  const handleCvTitleInputChange = useCallback((nextTitle: string) => {
    setCvTitleInput(nextTitle);
  }, []);

  const handleCvTitleCommit = useCallback(
    (rawTitle?: string) => {
      const source = typeof rawTitle === "string" ? rawTitle : cvTitleInput;
      const normalized = source.trim() || "Nouveau CV";
      setCvTitleInput(normalized);
      if (!cvId) return;
      if (cvRecord?.title === normalized) return;
      const updated = upsertCvRecord(cvId, { title: normalized });
      setCvRecord(updated);
    },
    [cvId, cvRecord?.title, cvTitleInput],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => {
      if (!e.matches) setMobileTab("edit");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // beforeunload prompt removed: auto-save (debounced 300 ms + pagehide
  // flush in useCvDraft) already commits work in flight, and RHF's
  // formState.isDirty was firing on a freshly-reset form (Zod resolver +
  // nested defaults), making the prompt appear on a blank editor.

  return (
    <FormProvider {...form}>
      <EditorShell
        cvId={cvId}
        templateId={templateId}
        templateName={templateMeta.name}
        cvTitle={cvTitleInput}
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
        onTemplateChange={handleTemplateChange}
        onCvTitleChange={handleCvTitleInputChange}
        onCvTitleCommit={handleCvTitleCommit}
        resetNonce={resetNonce}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
      />
    </FormProvider>
  );
}

type EditorShellProps = {
  cvId: string;
  templateId: TemplateId;
  templateName: string;
  cvTitle: string;
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
  onTemplateChange: (nextTemplateId: TemplateId) => void;
  onCvTitleChange: (nextTitle: string) => void;
  onCvTitleCommit: (rawTitle?: string) => void;
  resetNonce: number;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (next: boolean) => void;
};

function EditorShell({
  cvId,
  templateId,
  templateName,
  cvTitle,
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
  resetDraft,
  onTemplateChange,
  onCvTitleChange,
  onCvTitleCommit,
  resetNonce,
  sidebarCollapsed,
  setSidebarCollapsed,
}: EditorShellProps) {
  const autofillSync = useAutofillSync<CvData>();
  const { ratio, setRatio, resetRatio } = useEditorSplit();
  const splitContainerRef = useRef<HTMLDivElement>(null);
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
  const [editorTab, setEditorTab] = useState<EditorTabKey>("cv");

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
        className="atelier-paper flex min-h-screen text-[var(--color-ink)]"
      >
        <EditorSidebar
          activeCvId={cvId}
          activeTemplateId={templateId}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
        <div className="flex min-w-0 flex-1 flex-col">
        <EditorHeader
          templateId={templateId}
          templateName={templateName}
          persistStatus={persistStatus}
          scale={scale}
          setScale={setScale}
          resetScale={resetScale}
          overflowMode={overflowMode}
          resetDraft={resetDraft}
        />

        {unknownQuery && !unknownBannerDismissed ? (
          <UnknownTemplateBanner
            fallbackName={templateName}
            onDismiss={onDismissUnknownBanner}
          />
        ) : null}

        <div
          ref={splitContainerRef}
          className="relative md:flex md:min-w-0 md:flex-1"
        >
          <section
            role="tabpanel"
            id="editor-panel-edit"
            aria-labelledby="editor-tab-edit"
            style={{ flexBasis: `${ratio * 100}%` }}
            className={cn(
              "md:min-w-0 md:shrink-0 md:grow-0",
              mobileTab === "preview" ? "hidden md:block" : "block",
            )}
          >
            <form
              noValidate
              onSubmit={(e) => e.preventDefault()}
              className="px-4 pt-4 pb-24 md:h-[calc(100vh-64px)] md:overflow-y-auto md:px-8 md:py-8"
              aria-label="Formulaire CV"
            >
              <EditorTabs value={editorTab} onChange={setEditorTab} />
              {editorTab === "cv" ? (
                <>
                  <div className="mb-6 w-full rounded-md border border-[var(--color-rule)] bg-white/75 p-3">
                    <label
                      htmlFor="cv-title-input"
                      className="font-mono-caps mb-2 block text-[10px] text-[var(--color-ink-soft)]"
                    >
                      Nom du CV
                    </label>
                    <input
                      id="cv-title-input"
                      type="text"
                      value={cvTitle}
                      onChange={(event) => onCvTitleChange(event.target.value)}
                      onBlur={(event) => onCvTitleCommit(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          onCvTitleCommit((event.target as HTMLInputElement).value);
                          (event.target as HTMLInputElement).blur();
                        }
                      }}
                      className="h-9 w-full rounded-md border border-[var(--color-rule)] bg-white px-3 text-[13px] text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30"
                      aria-label="Titre du CV"
                    />
                  </div>
                  <FormSections
                    highlightedSection={highlightedSection}
                    highlightedItemId={highlightedItemId}
                    setSectionRef={setSectionRef}
                    setItemRef={setItemRef}
                  />
                </>
              ) : editorTab === "design" ? (
                <DesignPanel templateId={templateId} />
              ) : (
                <LanguagePanel />
              )}
            </form>
          </section>

          <EditorSplitter
            ratio={ratio}
            onChange={setRatio}
            onReset={resetRatio}
            containerRef={splitContainerRef}
          />

          <section
            role="tabpanel"
            id="editor-panel-preview"
            aria-labelledby="editor-tab-preview"
            className={cn(
              "md:min-w-0 md:flex-1",
              mobileTab === "edit" ? "hidden md:block" : "block",
            )}
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
                  headerActions={
                    <TemplateDrawerButton
                      currentTemplateId={templateId}
                      onTemplateChange={onTemplateChange}
                    />
                  }
                />
              </div>
            </aside>
          </section>
        </div>

        <div className="md:hidden">
          <MobileTabBar active={mobileTab} onChange={setMobileTab} />
        </div>
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
    cn("scroll-mt-24 rounded-md transition-colors", highlightedSection === id && "editor-jump-highlight");

  return (
    <div className="flex w-full flex-col gap-10">
      <div ref={setSectionRef("personalInfo")} className={sectionClass("personalInfo")}>
        <PersonalInfoForm highlightedItemId={highlightedItemId} setItemRef={setItemRef} />
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
  resetDraft,
}: {
  templateId: TemplateId;
  templateName: string;
  persistStatus: PersistStatus;
  scale: number;
  setScale: (next: number) => void;
  resetScale: () => void;
  overflowMode: OverflowMode;
  resetDraft: () => void;
}) {
  const { isAuthenticated } = useAuth0();
  const badgeStatus: SyncStatus =
    persistStatus === "failed"
      ? "error"
      : persistStatus === "saving"
        ? "saving"
        : persistStatus === "offline"
          ? "offline"
          : persistStatus === "saved"
            ? "saved"
            : "idle";
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[var(--color-rule)] bg-[var(--color-paper)]/85 px-6 backdrop-blur">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="font-display truncate text-[18px] font-medium text-[var(--color-ink)]">
          Éditeur · {templateName}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline">
          <SyncStatusBadge status={badgeStatus} authed={isAuthenticated} />
        </span>
        <ScaleSlider scale={scale} setScale={setScale} resetScale={resetScale} />
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

function TemplateDrawerButton({
  currentTemplateId,
  onTemplateChange,
}: {
  currentTemplateId: TemplateId;
  onTemplateChange: (nextTemplateId: TemplateId) => void;
}) {
  const [open, setOpen] = useState(false);
  const currentTemplateName =
    templateRegistry.find((template) => template.id === currentTemplateId)?.name ??
    "Classique";

  const handleSelect = (templateId: TemplateId) => {
    onTemplateChange(templateId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="inline-flex min-h-9 items-center rounded-md border border-[var(--color-rule)] bg-white/70 px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink)] transition-colors hover:bg-white motion-reduce:transition-none"
          >
            Templates
          </button>
        }
      />
      <DialogContent
        showCloseButton={false}
        className="editor-template-drawer left-0 top-auto bottom-0 grid h-[min(76vh,38rem)] w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-t-3xl rounded-b-none border border-[var(--color-rule)] bg-white/68 p-0 text-[var(--color-ink)] shadow-[0_20px_44px_-24px_rgba(10,10,10,0.62)] backdrop-blur-2xl sm:left-1/2 sm:bottom-6 sm:h-[min(72vh,40rem)] sm:w-[min(calc(100vw-3rem),36rem)] sm:max-w-none sm:-translate-x-1/2 sm:rounded-3xl md:top-0 md:right-0 md:bottom-0 md:left-auto md:h-screen md:w-[28rem] md:translate-x-0 md:translate-y-0 md:rounded-none md:border-l md:border-t-0 md:border-r-0"
      >
        <DialogHeader className="border-b border-[var(--color-rule)] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
                Bibliotheque templates
              </p>
              <DialogTitle className="font-display mt-2 text-[29px] font-medium text-[var(--color-ink)]">
                {currentTemplateName}
              </DialogTitle>
            </div>
            <DialogClose
              render={
                <button
                  type="button"
                  aria-label="Fermer le panneau templates"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-rule)] bg-white/70 text-[18px] text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
                >
                  ×
                </button>
              }
            />
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-4">
          <div className="grid gap-2.5">
            {templateRegistry.map((template) => {
              const isActive = template.id === currentTemplateId;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelect(template.id)}
                  className={cn(
                    "group rounded-2xl border p-4 text-left transition-all duration-200 motion-reduce:transition-none",
                    "bg-white/82 hover:bg-white",
                    isActive
                      ? "border-[var(--color-ink)] shadow-[0_10px_24px_-20px_rgba(10,10,10,0.8)]"
                      : "border-[var(--color-rule)]",
                  )}
                  aria-pressed={isActive}
                >
                  <div className="font-mono-caps flex items-center justify-between text-[10px] text-[var(--color-ink-soft)]">
                    <span>{template.id}</span>
                    {isActive ? <span>Actif</span> : <span>Appliquer</span>}
                  </div>
                  <h3 className="font-display mt-2 text-[25px] leading-none text-[var(--color-ink)]">
                    {template.name}
                  </h3>
                  <p className="mt-2 text-[13px] leading-snug text-[var(--color-ink-soft)]">
                    {template.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
