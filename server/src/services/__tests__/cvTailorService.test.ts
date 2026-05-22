import { describe, expect, it } from "bun:test";
import { createEmptyMaster } from "@cvie/shared";
import { buildSetPersonalInfo } from "../cvTailorTools/personalInfo";
import type { WorkingCv } from "../cvTailorTools/index";

describe("cvTailorService.tailor", () => {
  it("rejects unknown summary id with ok:false", async () => {
    const master = createEmptyMaster("A", "B");
    const working: WorkingCv = {
      cv: {
        personalInfo: { firstName: "", lastName: "", portfolioDisplay: "clickable" },
        experiences: [], formations: [], skills: [], languages: [], interests: [],
        themeId: "x",
        customization: {},
      },
      pendingChanges: [],
    };
    const t = buildSetPersonalInfo(master, working);
    const result = await (t as unknown as { execute: (a: { summaryId: string }) => Promise<{ ok: boolean; error?: string }> }).execute({ summaryId: "bogus" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("unknown_summary_id");
  });
});
