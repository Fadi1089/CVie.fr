import type { z } from "zod";
import { cvDataSchema } from "../../schemas/cv";
import type { JsonResume } from "./schema";
import { cvDateToIso, type SupportedLocale } from "./dates";

type Cv = z.infer<typeof cvDataSchema>;

const CEFR_FLUENCY: Record<string, string> = {
  A1: "A1 — débutant",
  A2: "A2 — élémentaire",
  B1: "B1 — intermédiaire",
  B2: "B2 — intermédiaire supérieur",
  C1: "C1 — avancé",
  C2: "C2 — maîtrise",
  natif: "Natif",
};

function emptyToUndef(s: string | undefined): string | undefined {
  return s && s.trim().length > 0 ? s : undefined;
}

function linkedinUsername(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("linkedin.com")) return undefined;
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("in");
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    return parts[parts.length - 1];
  } catch {
    return undefined;
  }
}

export function cvToJsonResume(cv: Cv): JsonResume {
  const p = cv.personalInfo;
  const locale: SupportedLocale = cv.appearance?.locale ?? "fr";

  const profiles: JsonResume["basics"]["profiles"] = [];
  const linkedin = emptyToUndef(p.linkedinUrl);
  if (linkedin) {
    profiles.push({
      network: "LinkedIn",
      username: linkedinUsername(linkedin),
      url: linkedin,
    });
  }

  const x_cvie: NonNullable<JsonResume["basics"]["x_cvie"]> = {};
  if (p.portfolioDisplay) x_cvie.portfolioDisplay = p.portfolioDisplay;
  if (locale) x_cvie.locale = locale;

  const basics: JsonResume["basics"] = {
    name: `${p.firstName} ${p.lastName}`.trim(),
    label: emptyToUndef(p.jobTitle),
    image: emptyToUndef(p.photoUrl),
    email: emptyToUndef(p.email),
    phone: emptyToUndef(p.phone),
    url: emptyToUndef(p.portfolioUrl),
    summary: emptyToUndef(p.summary),
    location: emptyToUndef(p.city) ? { city: p.city } : undefined,
    profiles,
    x_cvie: Object.keys(x_cvie).length > 0 ? x_cvie : undefined,
  };

  const work: JsonResume["work"] = cv.experiences.map((e) => ({
    name: e.company,
    position: e.jobTitle,
    location: emptyToUndef(e.city),
    startDate: cvDateToIso(e.startDate),
    endDate: cvDateToIso(e.endDate),
    summary: emptyToUndef(e.description),
    highlights: e.bullets ?? [],
  }));

  const education: JsonResume["education"] = cv.formations.map((f) => ({
    institution: f.school,
    studyType: f.degree,
    area: undefined,
    location: emptyToUndef(f.city),
    startDate: cvDateToIso(f.startDate),
    endDate: cvDateToIso(f.endDate),
    summary: emptyToUndef(f.description),
  }));

  // Group skills by category. Items without a category fall into "Compétences".
  const skillBuckets = new Map<string, string[]>();
  for (const s of cv.skills) {
    const bucket = emptyToUndef(s.category) ?? "Compétences";
    const list = skillBuckets.get(bucket) ?? [];
    list.push(s.name);
    skillBuckets.set(bucket, list);
  }
  const skills: JsonResume["skills"] = [...skillBuckets.entries()].map(
    ([name, keywords]) => ({ name, level: undefined, keywords }),
  );

  const languages: JsonResume["languages"] = cv.languages.map((l) => ({
    language: l.name,
    fluency: CEFR_FLUENCY[l.level] ?? l.level,
  }));

  const interests: JsonResume["interests"] =
    cv.interests.length === 0
      ? []
      : [{ name: "Centres d'intérêt", keywords: cv.interests.map((i) => i.name) }];

  return { basics, work, education, skills, languages, interests };
}
