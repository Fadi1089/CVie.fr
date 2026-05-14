import { describe, it, expect } from "vitest";
import { jsonResumeSchema } from "./schema";

describe("jsonResumeSchema", () => {
  it("accepts a minimal resume with only basics.name", () => {
    const parsed = jsonResumeSchema.parse({ basics: { name: "Jane Doe" } });
    expect(parsed.basics.name).toBe("Jane Doe");
    expect(parsed.work).toEqual([]);
  });

  it("rejects a resume with no basics block", () => {
    expect(() => jsonResumeSchema.parse({})).toThrow();
  });

  it("normalises missing arrays to empty arrays (no undefined)", () => {
    const parsed = jsonResumeSchema.parse({ basics: { name: "X" } });
    expect(parsed.work).toEqual([]);
    expect(parsed.education).toEqual([]);
    expect(parsed.skills).toEqual([]);
    expect(parsed.languages).toEqual([]);
    expect(parsed.interests).toEqual([]);
  });

  it("rejects javascript: URLs inside basics.url", () => {
    expect(() =>
      jsonResumeSchema.parse({
        basics: { name: "X", url: "javascript:alert(1)" },
      }),
    ).toThrow();
  });

  it("accepts CVie extension fields under x_cvie", () => {
    const parsed = jsonResumeSchema.parse({
      basics: {
        name: "X",
        x_cvie: { portfolioDisplay: "qr", locale: "fr" },
      },
    });
    expect(parsed.basics.x_cvie?.portfolioDisplay).toBe("qr");
    expect(parsed.basics.x_cvie?.locale).toBe("fr");
  });

  it("preserves the order of work entries", () => {
    const parsed = jsonResumeSchema.parse({
      basics: { name: "X" },
      work: [
        { name: "A", position: "p", startDate: "2020-01" },
        { name: "B", position: "p", startDate: "2021-01" },
      ],
    });
    expect(parsed.work.map((w) => w.name)).toEqual(["A", "B"]);
  });
});
