import { describe, it, expect } from "vitest";
import { sampleResume } from "./sampleResume";
import { jsonResumeSchema } from "../jsonResume/schema";
import { cvToJsonResume } from "../jsonResume/mapper";
import { sampleCv } from "./sampleCv";

describe("sampleResume", () => {
  it("validates against jsonResumeSchema", () => {
    expect(() => jsonResumeSchema.parse(sampleResume)).not.toThrow();
  });

  it("is the materialised form of sampleCv (drift check)", () => {
    expect(cvToJsonResume(sampleCv)).toEqual(sampleResume);
  });
});
