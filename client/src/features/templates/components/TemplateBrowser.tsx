import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Link, useNavigate } from "react-router";
import {
  cvDataSchema,
  templateRegistry,
  type CvData,
  type OverflowMode,
} from "@cvie/shared";
import { TemplatePreviewFrame } from "./TemplatePreviewFrame";
import { CvFirstPagePreview } from "./CvFirstPagePreview";
import {
  createCvRecord,
  formatUpdatedAt,
  readCvLibrary,
  type CvLibraryRecord,
} from "@/features/cv-library/storage";

const STORAGE_KEY = "cvie.template.selected";
const OVERFLOW_MODE_STORAGE_KEY = "cvie.cv.overflow-mode";
const CV_SCALE_STORAGE_KEY = "cvie.cv.scale";

export function TemplateBrowser() {
  const navigate = useNavigate();
  const [library, setLibrary] = useState<CvLibraryRecord[]>(() => readCvLibrary());
  const [activeCvId, setActiveCvId] = useState<string>(library[0]?.id ?? "");
  const [previewCvId, setPreviewCvId] = useState<string>(library[0]?.id ?? "");
  const [activeCvDraft, setActiveCvDraft] = useState<CvData | null>(null);
  const [overflowMode, setOverflowMode] = useState<OverflowMode>("section");
  const [cvScale, setCvScale] = useState<number>(1);

  useEffect(() => {
    setLibrary(readCvLibrary());
  }, []);

  useEffect(() => {
    if (!library.length) return;
    if (!library.some((cv) => cv.id === activeCvId)) {
      setActiveCvId(library[0].id);
    }
    if (!library.some((cv) => cv.id === previewCvId)) {
      setPreviewCvId(library[0].id);
    }
  }, [activeCvId, library, previewCvId]);

  const activeCv = useMemo(
    () =>
      library.find((cv) => cv.id === previewCvId) ??
      library.find((cv) => cv.id === activeCvId) ??
      library[0],
    [activeCvId, library, previewCvId],
  );

  const activeTemplate = useMemo(
    () =>
      templateRegistry.find((template) => template.id === activeCv?.templateId) ??
      templateRegistry[0],
    [activeCv],
  );

  useEffect(() => {
    if (!activeCv?.id) {
      setActiveCvDraft(null);
      return;
    }
    try {
      const raw = window.localStorage.getItem(`cvie.cv.draft.${activeCv.id}`);
      if (!raw) {
        setActiveCvDraft(null);
        return;
      }
      const parsed = cvDataSchema.safeParse(JSON.parse(raw));
      setActiveCvDraft(parsed.success ? parsed.data : null);
    } catch {
      setActiveCvDraft(null);
    }
  }, [activeCv?.id]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(OVERFLOW_MODE_STORAGE_KEY);
      setOverflowMode(stored === "element" ? "element" : "section");
    } catch {
      setOverflowMode("section");
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CV_SCALE_STORAGE_KEY);
      if (raw !== null) {
        const parsed = parseFloat(raw);
        if (Number.isFinite(parsed) && parsed > 0) {
          setCvScale(Math.min(1, Math.max(0.5, parsed)));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleOpenCv = useCallback(
    (cv: CvLibraryRecord) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, cv.templateId);
      } catch {
        // ignore storage access issues
      }
      navigate(`/editor?template=${cv.templateId}&cv=${encodeURIComponent(cv.id)}`);
    },
    [navigate],
  );

  const handleCreateCv = useCallback(() => {
    const templateId = activeTemplate?.id ?? "classique";
    const newCv = createCvRecord(templateId);
    setLibrary(readCvLibrary());
    setActiveCvId(newCv.id);
    setPreviewCvId(newCv.id);
    try {
      window.localStorage.setItem(STORAGE_KEY, templateId);
    } catch {
      // ignore storage access issues
    }
    navigate(`/editor?template=${templateId}&cv=${encodeURIComponent(newCv.id)}&new=1`);
  }, [activeTemplate, navigate]);

  const handleHoverPreview = useCallback((cvId: string) => {
    // Avoid redundant state updates while moving inside the same card.
    setActiveCvId((prev) => (prev === cvId ? prev : cvId));
    setPreviewCvId((prev) => (prev === cvId ? prev : cvId));
  }, []);

  return (
    <div className="atelier-paper relative flex min-h-screen flex-col text-[var(--color-ink)]">
      <header className="sticky top-0 z-20 border-b border-[var(--color-rule)] bg-[rgba(250,250,247,0.82)] px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-baseline gap-3">
            <Link
              to="/"
              className="font-mono-caps text-[10px] text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] motion-reduce:transition-none"
            >
              ← CVie.fr
            </Link>
            <span className="text-[var(--color-dot)]">/</span>
            <span className="font-mono-caps text-[10px] text-[var(--color-ink)]">
              CV Library
            </span>
          </div>
        </div>
      </header>

      <section className="relative z-[1] mx-auto flex w-full max-w-7xl flex-1 px-6 py-3 xl:items-center">
        <div className="tpl-hero-reveal atelier-library-grid w-full">
          <div className="atelier-surface-panel wallet-folder atelier-library-panel relative flex flex-col overflow-hidden rounded-[32px] p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="mt-2 text-[21px] font-medium tracking-[-0.045em] text-[var(--color-ink)]">
                  CV Library
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateCv}
                className="inline-flex min-w-[12rem] items-center justify-center gap-2 rounded-full border border-[var(--color-rule)] bg-white/80 px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-ink-soft)] hover:bg-white motion-reduce:transition-none"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Ajouter un nouveau CV
              </button>
            </div>

            <div className="mx-auto min-h-0 w-full max-w-[520px] flex-1 space-y-3 overflow-y-auto pr-1">
              {library.map((cv, index) => {
                const isActive = cv.id === activeCvId;
                const templateName =
                  templateRegistry.find((template) => template.id === cv.templateId)?.name ??
                  "Classique";
                return (
                  <button
                    key={cv.id}
                    type="button"
                    onMouseEnter={() => handleHoverPreview(cv.id)}
                    onFocus={() => handleHoverPreview(cv.id)}
                    onClick={() => handleOpenCv(cv)}
                    aria-label={`Ouvrir ${cv.title} dans l'editeur`}
                    className={`wallet-cv-card-v2 group relative block h-[170px] w-full rounded-[28px] p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-white/45 ${
                      isActive ? "ring-2 ring-[var(--color-ink-soft)]/35" : ""
                    }`}
                  >
                    <div className="wallet-cv-bg">
                      <TemplatePreviewFrame
                        templateId={cv.templateId}
                        className="h-full w-full"
                        iframeClassName="wallet-cv-bg-iframe"
                      />
                    </div>
                    <div className="absolute left-4 top-3 z-[3]">
                      <span className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
                        CV {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="relative z-[2] mt-4 text-[26px] font-medium leading-none tracking-[-0.05em] text-[var(--color-ink)]">
                      {cv.title}
                    </h3>
                    <p className="relative z-[2] mt-1.5 text-[13px] leading-snug text-[var(--color-ink-soft)]">
                      Template: {templateName}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto border-t border-[var(--color-rule)] pt-3 grid content-start gap-2">
              <div className="rounded-[22px] border border-[var(--color-rule)] bg-white/72 p-4">
                <div className="grid gap-2.5 text-[13px]">
                  <div className="border-b border-[var(--color-rule)] pb-2">
                    <p className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
                      Derniere revision
                    </p>
                    <p className="mt-1 text-[14px] text-[var(--color-ink)]">
                      {activeCv ? formatUpdatedAt(activeCv.updatedAt) : "—"}
                    </p>
                  </div>
                  <div className="border-b border-[var(--color-rule)] pb-2">
                    <p className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
                      Template actif
                    </p>
                    <p className="mt-1 text-[14px] text-[var(--color-ink)]">
                      {activeTemplate?.name ?? "Classique"}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => activeCv && handleOpenCv(activeCv)}
                className="inline-flex w-full items-center justify-center rounded-full bg-[var(--color-ink)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-ink)]/90 motion-reduce:transition-none"
              >
                Ouvrir ce CV
              </button>
            </div>
          </div>

          <aside className="atelier-preview-panel">
            {activeCvDraft ? (
              <CvFirstPagePreview
                templateId={activeTemplate?.id ?? "classique"}
                cvData={activeCvDraft}
                overflowMode={overflowMode}
                cvScale={cvScale}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-center">
                <div>
                  <p className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
                    Apercu
                  </p>
                  <p className="mt-2 text-[15px] text-[var(--color-ink-soft)]">
                    CV pas encore conçu
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
