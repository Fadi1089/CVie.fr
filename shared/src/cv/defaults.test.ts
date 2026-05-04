import { describe, expect, it } from "vitest";
import { cvDataSchema } from "../schemas/cv";
import { createEmptyCv, sampleCv } from "./defaults";

describe("createEmptyCv", () => {
  it("returns an object with every CvData section present and empty", () => {
    const cv = createEmptyCv();
    expect(cv.personalInfo).toEqual({
      firstName: "",
      lastName: "",
      portfolioDisplay: "clickable",
    });
    expect(cv.formations).toEqual([]);
    expect(cv.experiences).toEqual([]);
    expect(cv.skills).toEqual([]);
    expect(cv.languages).toEqual([]);
    expect(cv.interests).toEqual([]);
  });

  it("is NOT schema-valid on its own (firstName/lastName are required)", () => {
    // Intentional: persistence layer only writes after safeParse succeeds,
    // so the empty skeleton never hits localStorage.
    const parsed = cvDataSchema.safeParse(createEmptyCv());
    expect(parsed.success).toBe(false);
  });

  it("becomes schema-valid once firstName/lastName are filled", () => {
    const cv = createEmptyCv();
    cv.personalInfo.firstName = "Alex";
    cv.personalInfo.lastName = "Martin";
    const parsed = cvDataSchema.safeParse(cv);
    expect(parsed.success).toBe(true);
  });

  it("returns a fresh object each call (no shared mutable state)", () => {
    const a = createEmptyCv();
    const b = createEmptyCv();
    a.personalInfo.firstName = "X";
    a.formations.push({
      id: "1",
      degree: "",
      school: "",
      startDate: "",
    });
    expect(b.personalInfo.firstName).toBe("");
    expect(b.formations).toEqual([]);
  });
});

describe("sampleCv", () => {
  it("is schema-valid (round-trips through cvDataSchema.parse)", () => {
    expect(() => cvDataSchema.parse(sampleCv)).not.toThrow();
  });
});
