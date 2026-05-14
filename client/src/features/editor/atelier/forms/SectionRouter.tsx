import type { SectionId } from "../TocRail";
import { PersonalInfoForm } from "./PersonalInfoForm";
import { FormationsForm } from "./FormationsForm";
import { ExperiencesForm } from "./ExperiencesForm";
import { SkillsForm } from "./SkillsForm";
import { LanguagesForm } from "./LanguagesForm";
import { InterestsForm } from "./InterestsForm";

export function SectionRouter({ active }: { active: SectionId }) {
  switch (active) {
    case "personal":
      return <PersonalInfoForm />;
    case "formations":
      return <FormationsForm />;
    case "experiences":
      return <ExperiencesForm />;
    case "skills":
      return <SkillsForm />;
    case "languages":
      return <LanguagesForm />;
    case "interests":
      return <InterestsForm />;
  }
}
