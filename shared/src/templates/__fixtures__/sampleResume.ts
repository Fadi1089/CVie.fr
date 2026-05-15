import type { JsonResume } from "../jsonResume/schema";

// Materialised output of cvToJsonResume(sampleCv). Drift is caught by
// sampleResume.test.ts — if you change the mapper or sampleCv, regenerate.
export const sampleResume: JsonResume = {
  basics: {
    name: "Yasmine Benali",
    label: "Ingénieure logicielle senior",
    email: "yasmine.benali@example.com",
    phone: "+33 6 12 34 56 78",
    url: "https://yasmine.dev",
    summary:
      "Ingénieure full-stack avec 8 ans d'expérience sur des plateformes à fort trafic. Spécialisée dans la performance et l'observabilité.",
    location: { city: "Paris, France" },
    profiles: [
      {
        network: "LinkedIn",
        username: "yasminebenali",
        url: "https://www.linkedin.com/in/yasminebenali",
      },
    ],
    x_cvie: { portfolioDisplay: "qr", locale: "fr" },
  },
  work: [
    {
      name: "Atelier SAS",
      position: "Ingénieure logicielle senior",
      location: "Paris",
      startDate: "2022-03",
      summary: undefined,
      highlights: [
        "Réduction de 60% de la latence API par mise en cache stratégique.",
        "Mentorat de 5 ingénieurs juniors.",
      ],
    },
    {
      name: "Startup XYZ",
      position: "Développeuse full-stack",
      location: "Paris",
      startDate: "2017-09",
      endDate: "2022-02",
      summary: undefined,
      highlights: ["Construction de la plateforme MVP en 3 mois."],
    },
  ],
  education: [
    {
      institution: "Télécom Paris",
      studyType: "Diplôme d'ingénieure",
      area: undefined,
      location: "Palaiseau",
      startDate: "2014-09",
      endDate: "2017-06",
      summary: "Spécialisation systèmes répartis et bases de données.",
    },
  ],
  skills: [
    { name: "Langages", level: undefined, keywords: ["TypeScript"] },
    { name: "Bases de données", level: undefined, keywords: ["PostgreSQL"] },
    { name: "Infra", level: undefined, keywords: ["Kubernetes"] },
  ],
  languages: [
    { language: "Français", fluency: "Natif" },
    { language: "Anglais", fluency: "C1 — avancé" },
    { language: "Arabe", fluency: "B2 — intermédiaire supérieur" },
  ],
  interests: [
    { name: "Centres d'intérêt", keywords: ["Lecture éditoriale"] },
  ],
};
