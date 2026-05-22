import { streamText, type StreamTextResult, type ToolSet } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { AiProvider, MasterCvData } from "@cvie/shared";
import { emptyWorkingCv, type WorkingCv } from "./cvTailorTools/index";
import { buildSetPersonalInfo } from "./cvTailorTools/personalInfo";
import { buildSelectExperience } from "./cvTailorTools/experiences";
import { buildSelectFormation } from "./cvTailorTools/formations";
import { buildSelectSkills } from "./cvTailorTools/skills";
import { buildSelectLanguages } from "./cvTailorTools/languages";
import { buildSelectInterests } from "./cvTailorTools/interests";
import { buildSelectProject } from "./cvTailorTools/projects";
import { buildSetOrder } from "./cvTailorTools/order";
import { buildFinalize } from "./cvTailorTools/finalize";

export function summarizeMaster(m: MasterCvData) {
  return {
    summaries: m.summaries.map((s) => ({ id: s.id, label: s.label })),
    experiences: m.experiences.map((e) => ({
      id: e.id, jobTitle: e.jobTitle, company: e.company,
      startDate: e.startDate, endDate: e.endDate, tags: e.tags,
      achievementCount: e.achievements.length,
    })),
    formations: m.formations.map((f) => ({
      id: f.id, degree: f.degree, school: f.school,
      startDate: f.startDate, endDate: f.endDate, tags: f.tags,
    })),
    skills: m.skills.map((s) => ({ id: s.id, name: s.name, category: s.category, tags: s.tags })),
    languages: m.languages.map((l) => ({ id: l.id, name: l.name, level: l.level })),
    interests: m.interests.map((i) => ({ id: i.id, name: i.name })),
    projects: m.projects.map((p) => ({ id: p.id, name: p.name, role: p.role, tags: p.tags })),
    certifications: m.certifications.map((c) => ({ id: c.id, name: c.name, issuer: c.issuer })),
  };
}

const TAILOR_PROMPT_FR = `Tu es un assistant qui construit un CV ciblé pour une offre d'emploi.
Tu disposes d'un "Master CV" contenant toutes les informations de l'utilisateur.
Tu dois sélectionner et adapter les éléments les plus pertinents pour l'offre.`;

const RULES_FR = `RÈGLES:
- Tu DOIS appeler dans l'ordre : setPersonalInfo, selectExperience (×N), selectFormation (×N),
  selectSkills, selectLanguages, selectInterests, selectProject (si pertinent), setOrder, finalize.
- Ne fabrique JAMAIS un masterId qui n'existe pas.
- Pour les reformulations : ne change que le vocabulaire pour matcher l'offre.
  N'ajoute pas de faits, ne change pas les dates, les entreprises, les diplômes.
- Cible : 3–6 expériences, 1–3 formations, 8–15 compétences. Adapte selon la séniorité.`;

export function buildSystemPrompt(args: {
  master: MasterCvData;
  jdText: string;
  userInstructions: string;
}): string {
  const jd = args.jdText.length > 8000 ? args.jdText.slice(0, 8000) + "\n[OFFRE TRONQUÉE]" : args.jdText;
  return `${TAILOR_PROMPT_FR}

${args.userInstructions}

MASTER CV (résumé pour sélection):
${JSON.stringify(summarizeMaster(args.master), null, 2)}

OFFRE D'EMPLOI:
${jd}

${RULES_FR}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StreamResult = StreamTextResult<ToolSet, any>;

function buildModel(provider: AiProvider, apiKey: string, model: string) {
  if (provider === "openai") return createOpenAI({ apiKey })(model);
  if (provider === "google") return createGoogleGenerativeAI({ apiKey })(model);
  return createAnthropic({ apiKey })(model);
}

export type TailorArgs = {
  master: MasterCvData;
  jdText: string;
  userInstructions: string;
  templateId: string;
  provider: AiProvider;
  apiKey: string;
  model: string;
  abortSignal?: AbortSignal;
};

export function startTailor(args: TailorArgs): { result: StreamResult; working: WorkingCv } {
  const working = emptyWorkingCv(args.templateId);
  const tools = {
    setPersonalInfo: buildSetPersonalInfo(args.master, working),
    selectExperience: buildSelectExperience(args.master, working),
    selectFormation: buildSelectFormation(args.master, working),
    selectSkills: buildSelectSkills(args.master, working),
    selectLanguages: buildSelectLanguages(args.master, working),
    selectInterests: buildSelectInterests(args.master, working),
    selectProject: buildSelectProject(args.master, working),
    setOrder: buildSetOrder(working),
    finalize: buildFinalize(working),
  };
  const system = buildSystemPrompt({ master: args.master, jdText: args.jdText, userInstructions: args.userInstructions });
  const result = streamText({
    model: buildModel(args.provider, args.apiKey, args.model),
    system,
    messages: [],
    tools,
    abortSignal: args.abortSignal,
    stopWhen: ({ steps }) => steps.length >= 20,
    maxOutputTokens: 8192,
  });
  return { result: result as unknown as StreamResult, working };
}
