import type { z } from "zod";
import { cvDataSchema } from "../../schemas/cv";

export type CvFixture = z.infer<typeof cvDataSchema>;

export const sampleCv: CvFixture = cvDataSchema.parse({
  personalInfo: {
    firstName: "Yasmine",
    lastName: "Benali",
    email: "yasmine.benali@example.com",
    phone: "+33 6 12 34 56 78",
    city: "Paris, France",
    jobTitle: "Ingénieure logicielle senior",
    summary:
      "Ingénieure full-stack avec 8 ans d'expérience sur des plateformes à fort trafic. Spécialisée dans la performance et l'observabilité.",
    linkedinUrl: "https://www.linkedin.com/in/yasminebenali",
    portfolioUrl: "https://yasmine.dev",
    portfolioDisplay: "qr",
  },
  formations: [
    {
      id: "f1",
      degree: "Diplôme d'ingénieure",
      school: "Télécom Paris",
      city: "Palaiseau",
      startDate: "2014-09",
      endDate: "2017-06",
      description: "Spécialisation systèmes répartis et bases de données.",
    },
  ],
  experiences: [
    {
      id: "e1",
      jobTitle: "Ingénieure logicielle senior",
      company: "Atelier SAS",
      city: "Paris",
      startDate: "2022-03",
      endDate: "present",
      bullets: [
        "Réduction de 60% de la latence API par mise en cache stratégique.",
        "Mentorat de 5 ingénieurs juniors.",
      ],
    },
    {
      id: "e2",
      jobTitle: "Développeuse full-stack",
      company: "Startup XYZ",
      city: "Paris",
      startDate: "2017-09",
      endDate: "2022-02",
      bullets: ["Construction de la plateforme MVP en 3 mois."],
    },
  ],
  skills: [
    { id: "s1", name: "TypeScript", level: "expert", category: "Langages" },
    { id: "s2", name: "PostgreSQL", level: "avancé", category: "Bases de données" },
    { id: "s3", name: "Kubernetes", level: "intermédiaire", category: "Infra" },
  ],
  languages: [
    { id: "l1", name: "Français", level: "natif" },
    { id: "l2", name: "Anglais", level: "C1" },
    { id: "l3", name: "Arabe", level: "B2" },
  ],
  interests: [{ id: "i1", name: "Lecture éditoriale" }],
});
