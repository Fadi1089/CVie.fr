import type { JsonResume } from "./schema";

function clean<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    if (Array.isArray(v) && v.length === 0) {
      out[k] = v;
      continue;
    }
    out[k] = v;
  }
  return out as T;
}

export function normalize(r: JsonResume): JsonResume {
  return {
    basics: clean({
      ...r.basics,
      location: r.basics.location ? clean(r.basics.location) : undefined,
      x_cvie: r.basics.x_cvie ? clean(r.basics.x_cvie) : undefined,
      profiles: r.basics.profiles
        .map((p) => clean(p))
        .filter((p) => p.network && (p.url || p.username)),
    }),
    work: r.work
      .map((w) => clean({ ...w, highlights: w.highlights.filter(Boolean) }))
      .filter((w) => w.name || w.position),
    education: r.education
      .map((e) => clean(e))
      .filter((e) => e.institution),
    skills: r.skills
      .map((s) => clean({ ...s, keywords: s.keywords.filter(Boolean) }))
      .filter((s) => (s.keywords as string[]).length > 0),
    languages: r.languages.map((l) => clean(l)).filter((l) => l.language),
    interests: r.interests
      .map((i) => clean({ ...i, keywords: i.keywords.filter(Boolean) }))
      .filter((i) => i.name),
  };
}
