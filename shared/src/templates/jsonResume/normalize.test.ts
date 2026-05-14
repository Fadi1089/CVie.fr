import { describe, it, expect } from "vitest";
import { normalize } from "./normalize";
import { sampleResume } from "../__fixtures__/sampleResume";

describe("normalize", () => {
  it("strips empty-string fields recursively", () => {
    const out = normalize({
      ...sampleResume,
      basics: { ...sampleResume.basics, email: "" as never },
    });
    expect((out.basics as Record<string, unknown>).email).toBeUndefined();
  });

  it("removes work entries whose name AND position are both empty", () => {
    const out = normalize({
      ...sampleResume,
      work: [...sampleResume.work, { name: "", position: "", highlights: [] }],
    });
    expect(out.work).toHaveLength(sampleResume.work.length);
  });

  it("removes skill buckets whose keywords list is empty", () => {
    const out = normalize({
      ...sampleResume,
      skills: [
        ...sampleResume.skills,
        { name: "Empty bucket", level: undefined, keywords: [] },
      ],
    });
    expect(out.skills.map((s) => s.name)).not.toContain("Empty bucket");
  });

  it("is idempotent", () => {
    expect(normalize(normalize(sampleResume))).toEqual(normalize(sampleResume));
  });
});
