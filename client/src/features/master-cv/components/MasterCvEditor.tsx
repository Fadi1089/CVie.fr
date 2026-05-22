import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { useMasterCv } from "../hooks/useMasterCv";
import { useMasterCvDraft } from "../hooks/useMasterCvDraft";
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

export function MasterCvEditor() {
  const { isAuthenticated, isLoading } = useAuth0();
  const navigate = useNavigate();
  const { state, setData } = useMasterCv();

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
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Mon Master CV</h1>
        <span className="text-xs text-[var(--color-ink-soft)]">
          {status === "saving" ? "Enregistrement…" : status === "offline" ? "Hors-ligne" : "Enregistré"}
        </span>
      </header>
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
