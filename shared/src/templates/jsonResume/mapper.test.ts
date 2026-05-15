import { describe, it, expect } from "vitest";
import { cvToJsonResume } from "./mapper";
import { sampleCv } from "../__fixtures__/sampleCv";
import { jsonResumeSchema } from "./schema";

describe("cvToJsonResume", () => {
  it("produces a JSON Resume document that validates against the schema", () => {
    const resume = cvToJsonResume(sampleCv);
    expect(() => jsonResumeSchema.parse(resume)).not.toThrow();
  });

  it("maps personalInfo to basics", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.basics.name).toBe("Yasmine Benali");
    expect(r.basics.label).toBe("Ingénieure logicielle senior");
    expect(r.basics.email).toBe("yasmine.benali@example.com");
    expect(r.basics.location?.city).toBe("Paris, France");
  });

  it("encodes the linkedin profile under basics.profiles", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.basics.profiles).toContainEqual({
      network: "LinkedIn",
      username: "yasminebenali",
      url: "https://www.linkedin.com/in/yasminebenali",
    });
  });

  it("maps portfolioUrl to basics.url", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.basics.url).toBe("https://yasmine.dev");
  });

  it("carries portfolioDisplay and locale through x_cvie", () => {
    const r = cvToJsonResume({
      ...sampleCv,
      appearance: { locale: "fr" },
    });
    expect(r.basics.x_cvie?.portfolioDisplay).toBe("qr");
    expect(r.basics.x_cvie?.locale).toBe("fr");
  });

  it("maps experiences to work, preserving order and bullets", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.work).toHaveLength(2);
    expect(r.work[0]!.name).toBe("Atelier SAS");
    expect(r.work[0]!.position).toBe("Ingénieure logicielle senior");
    expect(r.work[0]!.startDate).toBe("2022-03");
    expect(r.work[0]!.endDate).toBeUndefined(); // "present" → undefined
    expect(r.work[0]!.highlights).toEqual([
      "Réduction de 60% de la latence API par mise en cache stratégique.",
      "Mentorat de 5 ingénieurs juniors.",
    ]);
  });

  it("maps formations to education", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.education).toHaveLength(1);
    expect(r.education[0]!.institution).toBe("Télécom Paris");
    expect(r.education[0]!.studyType).toBe("Diplôme d'ingénieure");
    expect(r.education[0]!.endDate).toBe("2017-06");
  });

  it("groups skills by category into JSON Resume skill buckets", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.skills).toEqual(
      expect.arrayContaining([
        { name: "Langages", level: undefined, keywords: ["TypeScript"] },
        { name: "Bases de données", level: undefined, keywords: ["PostgreSQL"] },
        { name: "Infra", level: undefined, keywords: ["Kubernetes"] },
      ]),
    );
  });

  it("maps languages with human-readable CEFR fluency", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.languages).toContainEqual({
      language: "Anglais",
      fluency: "C1 — avancé",
    });
    expect(r.languages).toContainEqual({
      language: "Français",
      fluency: "Natif",
    });
  });

  it("rolls all interests into a single 'Centres d'intérêt' bucket", () => {
    const r = cvToJsonResume(sampleCv);
    expect(r.interests).toEqual([
      { name: "Centres d'intérêt", keywords: ["Lecture éditoriale"] },
    ]);
  });

  it("omits empty optional fields rather than emitting empty strings", () => {
    const cv = {
      ...sampleCv,
      personalInfo: { ...sampleCv.personalInfo, email: "", phone: "" },
    };
    const r = cvToJsonResume(cv);
    expect(r.basics.email).toBeUndefined();
    expect(r.basics.phone).toBeUndefined();
  });
});
