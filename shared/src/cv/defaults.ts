import type { CvData } from "../types/cv";

/**
 * Empty CV skeleton used as the editor's initial state before hydration.
 *
 * Note: `firstName` / `lastName` carry `min(1)` in the schema, so this empty
 * object is intentionally NOT schema-valid. The persistence layer only writes
 * to localStorage after `cvDataSchema.safeParse` succeeds, so an empty draft
 * never reaches disk. This just gives React Hook Form a fully-typed starting
 * shape so every field has a defined value on first render.
 */
export function createEmptyCv(): CvData {
  // Every field is explicit so RHF's `reset(emptyCv)` clears every previously
  // registered field. A sparse object would leave already-typed values like
  // email/phone in place when switching to a fresh CV.
  return {
    personalInfo: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      city: "",
      jobTitle: "",
      summary: "",
      linkedinUrl: "",
      portfolioUrl: "",
      portfolioDisplay: "clickable",
      photoUrl: "",
    },
    formations: [],
    experiences: [],
    skills: [],
    languages: [],
    interests: [],
    themeId: "atelier-classique",
    customization: {},
  };
}

/**
 * Realistic sample CV for a French L3 Informatique student seeking alternance.
 * Used for template previews, tests, and developer demos.
 */
export const sampleCv: CvData = {
  personalInfo: {
    firstName: "Yasmine",
    lastName: "Benali",
    email: "yasmine.benali@example.fr",
    phone: "06 12 34 56 78",
    city: "Lyon",
    jobTitle: "Étudiante en L3 Informatique — Alternance 2026",
    summary:
      "Étudiante passionnée par le développement web et les architectures cloud. À la recherche d'une alternance Master pour septembre 2026 afin d'approfondir mes compétences en ingénierie logicielle.",
    linkedinUrl: "https://linkedin.com/in/yasmine-benali",
    portfolioDisplay: "clickable",
    // Generic SVG person-silhouette placeholder (no real photo).
    // Inline data URI — works in iframe srcDoc, no network fetch, ATS ignores <img>.
    photoUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
          '<rect width="100" height="100" fill="#e5e7eb"/>' +
          '<circle cx="50" cy="38" r="15" fill="#9ca3af"/>' +
          '<path d="M20 90c0-16 13-26 30-26s30 10 30 26z" fill="#9ca3af"/>' +
          "</svg>",
      ),
  },
  formations: [
    {
      id: "f1",
      degree: "Licence Informatique (en cours)",
      school: "Université Claude Bernard Lyon 1",
      city: "Lyon",
      startDate: "2023-09",
      description:
        "Parcours Génie Logiciel. Matières clés : algorithmique, bases de données, systèmes distribués, génie logiciel.",
    },
    {
      id: "f2",
      degree: "Baccalauréat Général — Mention Bien",
      school: "Lycée du Parc",
      city: "Lyon",
      startDate: "2020-09",
      endDate: "2023-06",
      description: "Spécialités : Mathématiques, NSI, Physique-Chimie.",
    },
  ],
  experiences: [
    {
      id: "e1",
      jobTitle: "Stagiaire Développeuse Full-Stack",
      company: "Startup Lyonnaise (confidentiel)",
      city: "Lyon",
      startDate: "2025-06",
      endDate: "2025-08",
      bullets: [
        "Développement d'une application web React/Node.js pour la gestion de projets internes",
        "Mise en place de tests automatisés (Vitest) portant la couverture de 30% à 75%",
        "Participation aux revues de code et aux cérémonies agiles hebdomadaires",
      ],
    },
    {
      id: "e2",
      jobTitle: "Tutrice en Algorithmique",
      company: "Université Lyon 1 — Département Informatique",
      city: "Lyon",
      startDate: "2024-10",
      endDate: "2025-05",
      bullets: [
        "Accompagnement de 15 étudiants de L1 en travaux dirigés d'algorithmique",
        "Conception d'exercices complémentaires et préparation aux partiels",
      ],
    },
  ],
  skills: [
    { id: "s1", name: "JavaScript / TypeScript", level: "avancé", category: "Langages" },
    { id: "s2", name: "Python", level: "avancé", category: "Langages" },
    { id: "s3", name: "Java", level: "intermédiaire", category: "Langages" },
    { id: "s4", name: "React", level: "avancé", category: "Frameworks" },
    { id: "s5", name: "Node.js", level: "intermédiaire", category: "Frameworks" },
    { id: "s6", name: "PostgreSQL", level: "intermédiaire", category: "Bases de données" },
    { id: "s7", name: "Git / GitHub", level: "avancé", category: "Outils" },
    { id: "s8", name: "Docker", level: "débutant", category: "Outils" },
  ],
  languages: [
    { id: "l1", name: "Français", level: "natif" },
    { id: "l2", name: "Anglais", level: "C1" },
    { id: "l3", name: "Espagnol", level: "B1" },
  ],
  interests: [
    { id: "i1", name: "Photographie argentique" },
    { id: "i2", name: "Bénévolat associatif (GDG Lyon)" },
    { id: "i3", name: "Randonnée en montagne" },
  ],
  themeId: "atelier-classique",
  customization: {},
};
