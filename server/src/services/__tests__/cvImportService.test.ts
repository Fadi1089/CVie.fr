import { describe, expect, it, mock, beforeEach } from "bun:test";

const MOCK_CV_DATA = {
  personalInfo: {
    firstName: "Jean",
    lastName: "Dupont",
    email: "jean@example.com",
    phone: "0612345678",
    city: "Paris",
    jobTitle: "Développeur",
    summary: "Résumé test",
    linkedinUrl: "",
    portfolioUrl: "",
    photoUrl: "",
  },
  formations: [
    {
      id: "f1",
      degree: "Master Informatique",
      school: "Université Paris",
      city: "Paris",
      startDate: "2018-09",
      endDate: "2020-06",
      description: "",
    },
  ],
  experiences: [
    {
      id: "e1",
      jobTitle: "Développeur Web",
      company: "Acme Corp",
      city: "Paris",
      startDate: "2020-07",
      endDate: "present",
      bullets: ["Développement React", "API REST"],
      description: "",
    },
  ],
  skills: [{ id: "s1", name: "TypeScript", level: "avancé", category: "Développement" }],
  languages: [{ id: "l1", name: "Français", level: "natif" }],
  interests: [{ id: "i1", name: "Escalade" }],
};

// Mock Vercel AI SDK generateText
const mockGenerateText = mock(async () => ({
  text: JSON.stringify(MOCK_CV_DATA),
}));

mock.module("ai", () => ({
  generateText: mockGenerateText,
}));

// Mock provider packages — they only need to export a callable that returns a model identifier
mock.module("@ai-sdk/anthropic", () => ({
  anthropic: (modelId: string) => ({ provider: "anthropic", modelId }),
}));

mock.module("@ai-sdk/openai", () => ({
  openai: (modelId: string) => ({ provider: "openai", modelId }),
}));

// Mock pdf-parse
mock.module("pdf-parse", () => ({
  default: async (_buf: Buffer) => ({
    text: "Jean Dupont\nDéveloppeur\nParis\njean@example.com\n0612345678",
  }),
}));

import { extractCvFromPdf } from "../cvImportService";

describe("extractCvFromPdf", () => {
  beforeEach(() => {
    mockGenerateText.mockClear();
  });

  it("returns parsed CvData when AI returns valid JSON", async () => {
    const result = await extractCvFromPdf(Buffer.from("fake-pdf-bytes"));

    expect(result.personalInfo.firstName).toBe("Jean");
    expect(result.personalInfo.lastName).toBe("Dupont");
    expect(result.experiences).toHaveLength(1);
    expect(result.formations).toHaveLength(1);
    expect(result.skills[0]?.name).toBe("TypeScript");
    expect(result.languages[0]?.level).toBe("natif");
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it("throws when AI returns invalid JSON", async () => {
    mockGenerateText.mockImplementationOnce(async () => ({ text: "not json at all" }));

    await expect(extractCvFromPdf(Buffer.from("fake"))).rejects.toThrow(
      "L'IA n'a pas retourné un JSON valide",
    );
  });

  it("throws when AI returns JSON that fails CvData schema", async () => {
    mockGenerateText.mockImplementationOnce(async () => ({
      text: JSON.stringify({ personalInfo: { firstName: "" } }),
    }));

    await expect(extractCvFromPdf(Buffer.from("fake"))).rejects.toThrow("Données extraites invalides");
  });

  it("throws when PDF has no extractable text", async () => {
    mock.module("pdf-parse", () => ({
      default: async (_buf: Buffer) => ({ text: "   " }),
    }));

    await expect(extractCvFromPdf(Buffer.from("fake"))).rejects.toThrow(
      "Aucun texte trouvé",
    );
  });
});
