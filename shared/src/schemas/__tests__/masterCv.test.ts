import { describe, expect, it } from "vitest";
import { masterCvDataSchema } from "../masterCv";

describe("masterCvDataSchema", () => {
  it("accepts the empty master shape", () => {
    const result = masterCvDataSchema.safeParse({
      personalInfo: { firstName: "A", lastName: "B" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.experiences).toEqual([]);
      expect(result.data.summaries).toEqual([]);
      expect(result.data.projects).toEqual([]);
      expect(result.data.certifications).toEqual([]);
    }
  });

  it("allows up to 50 experiences with achievements and tags", () => {
    const experiences = Array.from({ length: 50 }, (_, i) => ({
      id: `mexp_${i}`,
      jobTitle: "Dev",
      company: "Acme",
      startDate: "2020-01",
      endDate: "2021-01",
      bullets: [],
      achievements: ["a", "b"],
      tags: ["backend", "ts"],
    }));
    const result = masterCvDataSchema.safeParse({
      personalInfo: { firstName: "A", lastName: "B" },
      experiences,
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 50 experiences", () => {
    const experiences = Array.from({ length: 51 }, () => ({
      id: "x",
      jobTitle: "Dev",
      company: "Acme",
      startDate: "2020-01",
      bullets: [],
      achievements: [],
      tags: [],
    }));
    const result = masterCvDataSchema.safeParse({
      personalInfo: { firstName: "A", lastName: "B" },
      experiences,
    });
    expect(result.success).toBe(false);
  });

  it("rejects notes longer than 8000 chars", () => {
    const result = masterCvDataSchema.safeParse({
      personalInfo: { firstName: "A", lastName: "B" },
      notes: "x".repeat(8001),
    });
    expect(result.success).toBe(false);
  });

  it("validates summary id + label + text shape", () => {
    const result = masterCvDataSchema.safeParse({
      personalInfo: { firstName: "A", lastName: "B" },
      summaries: [{ id: "msum_1", label: "Court", text: "hello" }],
    });
    expect(result.success).toBe(true);
  });
});
