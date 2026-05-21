import { masterCvDataSchema, type MasterCvData, type CvData } from "@cvie/shared";
import { prisma } from "../lib/prisma";
import { randomBytes } from "crypto";

export async function loadMasterCv(
  userId: string,
): Promise<MasterCvData | null> {
  const row = await prisma.masterCv.findUnique({ where: { userId } });
  if (!row) return null;
  const parsed = masterCvDataSchema.safeParse(row.data);
  if (!parsed.success) {
    throw new Error(`Stored master CV is invalid for user ${userId}`);
  }
  return parsed.data;
}

export async function saveMasterCv(
  userId: string,
  data: MasterCvData,
): Promise<MasterCvData> {
  const validated = masterCvDataSchema.parse(data);
  await prisma.masterCv.upsert({
    where: { userId },
    create: { userId, data: validated as object },
    update: { data: validated as object },
  });
  return validated;
}

const genId = (prefix: string) => `${prefix}_${randomBytes(4).toString("hex")}`;
const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();

export function mergeIntoMaster(
  seed: MasterCvData,
  sources: CvData[],
): MasterCvData {
  const out: MasterCvData = JSON.parse(JSON.stringify(seed));

  // experiences: dedup by (company, startDate, jobTitle), longest description wins
  const expKey = (e: { company: string; startDate: string; jobTitle: string }) =>
    `${norm(e.company)}|${e.startDate}|${norm(e.jobTitle)}`;
  const expMap = new Map<string, typeof out.experiences[number]>();
  for (const e of out.experiences) expMap.set(expKey(e), e);
  for (const src of sources) {
    for (const e of src.experiences ?? []) {
      const k = expKey(e);
      const existing = expMap.get(k);
      const incoming = {
        id: existing?.id ?? genId("mexp"),
        jobTitle: e.jobTitle, company: e.company, city: e.city,
        startDate: e.startDate, endDate: e.endDate,
        bullets: [] as string[],
        description: e.description,
        achievements: [...(existing?.achievements ?? []), ...(e.bullets ?? [])],
        tags: existing?.tags ?? [],
      };
      if (!existing) {
        expMap.set(k, incoming);
      } else {
        const winner = (e.description?.length ?? 0) > (existing.description?.length ?? 0) ? incoming : existing;
        const loser = winner === incoming ? existing : incoming;
        const all = [...(winner.achievements ?? []), ...(loser.achievements ?? [])];
        winner.achievements = [...new Set(all)];
        winner.tags = [...new Set([...(existing.tags ?? []), ...(incoming.tags ?? [])])];
        expMap.set(k, winner);
      }
    }
  }
  out.experiences = [...expMap.values()];

  // formations: dedup by (school, degree, startDate)
  const formKey = (f: { school: string; degree: string; startDate: string }) =>
    `${norm(f.school)}|${norm(f.degree)}|${f.startDate}`;
  const formMap = new Map<string, typeof out.formations[number]>();
  for (const f of out.formations) formMap.set(formKey(f), f);
  for (const src of sources) {
    for (const f of src.formations ?? []) {
      const k = formKey(f);
      if (!formMap.has(k)) {
        formMap.set(k, { id: genId("mform"), degree: f.degree, school: f.school, city: f.city, startDate: f.startDate, endDate: f.endDate, description: f.description, tags: [] });
      }
    }
  }
  out.formations = [...formMap.values()];

  // skills: dedup by name
  const skillMap = new Map<string, typeof out.skills[number]>(
    out.skills.map((s) => [norm(s.name), s]),
  );
  for (const src of sources) {
    for (const s of src.skills ?? []) {
      const k = norm(s.name);
      if (!skillMap.has(k)) skillMap.set(k, { id: genId("mskill"), name: s.name, level: s.level, category: s.category, tags: [] });
    }
  }
  out.skills = [...skillMap.values()];

  // languages
  const langMap = new Map<string, typeof out.languages[number]>(
    out.languages.map((l) => [norm(l.name), l]),
  );
  for (const src of sources) {
    for (const l of src.languages ?? []) {
      const k = norm(l.name);
      if (!langMap.has(k)) langMap.set(k, { id: genId("mlang"), name: l.name, level: l.level });
    }
  }
  out.languages = [...langMap.values()];

  // interests
  const intMap = new Map<string, typeof out.interests[number]>(
    out.interests.map((i) => [norm(i.name), i]),
  );
  for (const src of sources) {
    for (const i of src.interests ?? []) {
      const k = norm(i.name);
      if (!intMap.has(k)) intMap.set(k, { id: genId("mint"), name: i.name });
    }
  }
  out.interests = [...intMap.values()];

  // personalInfo: take from FIRST source with non-empty name when seed has none
  const seedHasName = (out.personalInfo.firstName || out.personalInfo.lastName);
  if (!seedHasName) {
    for (const src of sources) {
      if (src.personalInfo.firstName || src.personalInfo.lastName) {
        out.personalInfo = { ...src.personalInfo };
        break;
      }
    }
  }

  // summaries: seed one variant from first source summary if empty
  if (out.summaries.length === 0) {
    const firstSummary = sources.find((s) => s.personalInfo.summary?.trim())?.personalInfo.summary;
    if (firstSummary) out.summaries.push({ id: genId("msum"), label: "Par défaut", text: firstSummary });
  }

  return out;
}
