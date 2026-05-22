import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { useMasterCv } from "../hooks/useMasterCv";
import { useMasterCvDraft } from "../hooks/useMasterCvDraft";
import { useCvLibrary } from "@/features/cv-library/hooks/useCvLibrary";
import { createEmptyMaster, type MasterCvData } from "@cvie/shared";
import { PersonalInfoSection } from "./sections/PersonalInfoSection";
import { SummariesSection } from "./sections/SummariesSection";
import { ExperiencesSection } from "./sections/ExperiencesSection";
import { FormationsSection } from "./sections/FormationsSection";
import { SkillsSection } from "./sections/SkillsSection";
import { LanguagesSection } from "./sections/LanguagesSection";
import { InterestsSection } from "./sections/InterestsSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { CertificationsSection } from "./sections/CertificationsSection";
import { NotesSection } from "./sections/NotesSection";
import { MasterCvHeader } from "./MasterCvHeader";
import { SeedingPrompt, type SeedCv } from "./SeedingPrompt";
import { PdfImportDialog } from "./PdfImportDialog";

type PreviewPhase = "idle" | "seed-preview" | "pdf-dialog";

export function MasterCvEditor() {
  const { isAuthenticated, isLoading, user } = useAuth0();
  const navigate = useNavigate();
  const { state, setData, store } = useMasterCv();
  const { active } = useCvLibrary();
  const [previewPhase, setPreviewPhase] = useState<PreviewPhase>("idle");
  const [previewData, setPreviewData] = useState<MasterCvData | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/", { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  if (state.phase === "loading" || isLoading) {
    return <div className="px-6 py-10 text-sm text-[var(--color-ink-soft)]">Chargement…</div>;
  }
  if (state.phase === "error") {
    return <div className="px-6 py-10 text-sm text-red-600">{state.error}</div>;
  }
  if (state.phase === "needs-seed") {
    if (previewPhase === "seed-preview" && previewData) {
      return (
        <div
          className="mx-auto mt-20 max-w-md rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-6"
        >
          <h2 className="font-display text-xl">Aperçu de l'import</h2>
          <p className="mt-2 text-sm">Vous obtiendrez :</p>
          <ul className="mt-2 list-disc pl-6 text-sm">
            <li>{previewData.experiences.length} expériences</li>
            <li>{previewData.formations.length} formations</li>
            <li>{previewData.skills.length} compétences</li>
            <li>{previewData.languages.length} langues</li>
            <li>{previewData.interests.length} intérêts</li>
            <li>{previewData.projects.length} projets</li>
            <li>{previewData.certifications.length} certifications</li>
          </ul>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setPreviewPhase("idle");
                setPreviewData(null);
              }}
              className="font-mono-caps rounded-full px-4 py-2 text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
            >
              ANNULER
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const saved = await store.save(previewData);
                  setData(saved);
                } catch (err) {
                  console.error("preview save failed", err);
                }
              }}
              className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-[12px] font-medium text-white"
            >
              Confirmer
            </button>
          </div>
        </div>
      );
    }
    if (previewPhase === "pdf-dialog") {
      return (
        <PdfImportDialog
          onClose={() => setPreviewPhase("idle")}
          onExtracted={async (cv) => {
            try {
              const result = await store.seed([], cv);
              setPreviewData(result);
              setPreviewPhase("seed-preview");
            } catch (err) {
              console.error("pdf seed failed", err);
            }
          }}
        />
      );
    }
    if (active.length >= 1) {
      const cvs: SeedCv[] = active.map((r) => ({
        id: r.id,
        title: r.title,
        updatedAt: r.updatedAt,
      }));
      return (
        <SeedingPrompt
          cvs={cvs}
          onSeed={async (ids) => {
            try {
              const result = await store.seed(ids);
              setPreviewData(result);
              setPreviewPhase("seed-preview");
            } catch (err) {
              console.error("seed failed", err);
            }
          }}
          onSkip={async () => {
            try {
              const empty = createEmptyMaster(
                user?.given_name ?? "",
                user?.family_name ?? "",
              );
              const saved = await store.save(empty);
              setData(saved);
            } catch (err) {
              console.error("skip-save failed", err);
            }
          }}
          onPdf={() => setPreviewPhase("pdf-dialog")}
        />
      );
    }
    return <Editor initial={createEmptyMaster()} onCreate={setData} />;
  }
  return <Editor initial={state.data} onCreate={setData} />;
}

function Editor({
  initial,
  onCreate: _onCreate,
}: {
  initial: MasterCvData;
  onCreate: (d: MasterCvData) => void;
}) {
  const { data, status, update } = useMasterCvDraft(initial);
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <MasterCvHeader
        status={status}
        onImportFromCvs={() => console.info("import from CV: pending Task 27 wiring")}
        onImportPdf={() => console.info("import PDF: pending Task 28 wiring")}
      />
      <div className="mt-6">
        <PersonalInfoSection
          value={data.personalInfo}
          onChange={(pi) => update({ ...data, personalInfo: pi })}
        />
        <SummariesSection
          value={data.summaries}
          onChange={(s) => update({ ...data, summaries: s })}
        />
        <ExperiencesSection
          value={data.experiences}
          onChange={(experiences) => update({ ...data, experiences })}
        />
        <FormationsSection
          value={data.formations}
          onChange={(formations) => update({ ...data, formations })}
        />
        <SkillsSection
          value={data.skills}
          onChange={(skills) => update({ ...data, skills })}
        />
        <LanguagesSection
          value={data.languages}
          onChange={(languages) => update({ ...data, languages })}
        />
        <InterestsSection
          value={data.interests}
          onChange={(interests) => update({ ...data, interests })}
        />
        <ProjectsSection
          value={data.projects}
          onChange={(projects) => update({ ...data, projects })}
        />
        <CertificationsSection
          value={data.certifications}
          onChange={(certifications) => update({ ...data, certifications })}
        />
        <NotesSection
          value={data.notes ?? ""}
          onChange={(notes) => update({ ...data, notes })}
        />
      </div>
    </div>
  );
}
