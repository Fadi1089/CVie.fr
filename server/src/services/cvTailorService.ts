import type { MasterCvData } from "@cvie/shared";

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
