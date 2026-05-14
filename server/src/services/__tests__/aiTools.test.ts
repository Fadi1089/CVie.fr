import { describe, it, expect } from "bun:test";
import { sampleCv } from "@cvie/shared";
import { buildAssistantTools } from "../aiTools";

type ToolOutput =
  | { ok: true; patches: Array<{ path: string; before: unknown; after: unknown }>; message?: string }
  | { ok: false; error: string };

async function exec(
  tools: ReturnType<typeof buildAssistantTools>["tools"],
  name: string,
  input: unknown,
): Promise<ToolOutput> {
  // The Vercel `tool()` factory returns an object whose `execute` is the
  // callable. Bypass the static tool-set typing — we're driving each tool
  // directly without a model.
  const t = (tools as unknown as Record<string, { execute: (input: unknown) => Promise<ToolOutput> }>)[name];
  if (!t) throw new Error(`No such tool: ${name}`);
  return t.execute(input);
}

describe("aiTools", () => {
  describe("setPersonalInfo", () => {
    it("emits one patch per changed field", async () => {
      const { state, tools } = buildAssistantTools(sampleCv);
      const result = await exec(tools, "setPersonalInfo", {
        patch: { jobTitle: "Ingénieure logicielle", city: "Paris" },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const paths = result.patches.map((p) => p.path).sort();
      expect(paths).toEqual(["personalInfo.city", "personalInfo.jobTitle"]);
      expect(state.cv.personalInfo.city).toBe("Paris");
      expect(state.cv.personalInfo.jobTitle).toBe("Ingénieure logicielle");
    });

    it("returns ok with empty patches when nothing changes", async () => {
      const { tools } = buildAssistantTools(sampleCv);
      const result = await exec(tools, "setPersonalInfo", {
        patch: { city: sampleCv.personalInfo.city },
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.patches).toEqual([]);
    });

    it("rejects an invalid value via cvDataSchema", async () => {
      const { state, tools } = buildAssistantTools(sampleCv);
      const result = await exec(tools, "setPersonalInfo", {
        patch: { firstName: "" },
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toMatch(/personalInfo/);
      // state not mutated on failure
      expect(state.cv.personalInfo.firstName).toBe(sampleCv.personalInfo.firstName);
    });
  });

  describe("addExperience", () => {
    it("assigns a server id and inserts at the given position", async () => {
      const { state, tools } = buildAssistantTools(sampleCv);
      const result = await exec(tools, "addExperience", {
        experience: {
          jobTitle: "PM",
          company: "Acme",
          startDate: "2024-01",
          endDate: "present",
          bullets: ["Lancement produit"],
        },
        position: 0,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.patches).toHaveLength(1);
      expect(result.patches[0]?.path).toBe("experiences");
      expect(state.cv.experiences[0]?.jobTitle).toBe("PM");
      expect(state.cv.experiences[0]?.id).toMatch(/^exp_[0-9a-f]{8}$/);
      expect(state.cv.experiences.length).toBe(sampleCv.experiences.length + 1);
    });

    it("rejects an invalid date format", async () => {
      const { tools } = buildAssistantTools(sampleCv);
      const result = await exec(tools, "addExperience", {
        experience: {
          jobTitle: "PM",
          company: "Acme",
          startDate: "Jan 2024",
        },
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("updateExperience", () => {
    it("errors when id is unknown", async () => {
      const { tools } = buildAssistantTools(sampleCv);
      const result = await exec(tools, "updateExperience", {
        id: "exp_does_not_exist",
        patch: { jobTitle: "x" },
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toMatch(/exp_does_not_exist/);
    });

    it("merges the patch and emits per-field patches", async () => {
      const { state, tools } = buildAssistantTools(sampleCv);
      const target = sampleCv.experiences[0]!;
      const result = await exec(tools, "updateExperience", {
        id: target.id,
        patch: { jobTitle: "Lead Engineer" },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.patches.map((p) => p.path)).toContain("experiences[0].jobTitle");
      expect(state.cv.experiences[0]?.jobTitle).toBe("Lead Engineer");
    });
  });

  describe("removeExperience", () => {
    it("drops the entry and emits a whole-array patch", async () => {
      const { state, tools } = buildAssistantTools(sampleCv);
      const id = sampleCv.experiences[0]!.id;
      const result = await exec(tools, "removeExperience", { id });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.patches[0]?.path).toBe("experiences");
      const after = result.patches[0]?.after as Array<{ id: string }>;
      expect(after.find((e) => e.id === id)).toBeUndefined();
      expect(state.cv.experiences.find((e) => e.id === id)).toBeUndefined();
    });
  });

  describe("reorderExperiences", () => {
    it("requires a permutation of existing ids", async () => {
      const { tools } = buildAssistantTools(sampleCv);
      const result = await exec(tools, "reorderExperiences", {
        ids: ["wrong-id"],
      });
      expect(result.ok).toBe(false);
    });

    it("reorders when ids match", async () => {
      const { state, tools } = buildAssistantTools(sampleCv);
      const ids = sampleCv.experiences.map((e) => e.id).reverse();
      const result = await exec(tools, "reorderExperiences", { ids });
      expect(result.ok).toBe(true);
      expect(state.cv.experiences.map((e) => e.id)).toEqual(ids);
    });
  });

  describe("experience bullets", () => {
    it("adds, updates, and removes a bullet", async () => {
      const { state, tools } = buildAssistantTools(sampleCv);
      const expId = sampleCv.experiences[0]!.id;
      const before = state.cv.experiences[0]!.bullets.length;

      const addRes = await exec(tools, "addExperienceBullet", {
        experienceId: expId,
        text: "Mise en place CI/CD",
      });
      expect(addRes.ok).toBe(true);
      expect(state.cv.experiences[0]!.bullets.length).toBe(before + 1);

      const updRes = await exec(tools, "updateExperienceBullet", {
        experienceId: expId,
        index: 0,
        text: "Bullet réécrite",
      });
      expect(updRes.ok).toBe(true);
      expect(state.cv.experiences[0]!.bullets[0]).toBe("Bullet réécrite");

      const rmRes = await exec(tools, "removeExperienceBullet", {
        experienceId: expId,
        index: 0,
      });
      expect(rmRes.ok).toBe(true);
      expect(state.cv.experiences[0]!.bullets.length).toBe(before);
    });

    it("errors on out-of-bounds index", async () => {
      const { tools } = buildAssistantTools(sampleCv);
      const expId = sampleCv.experiences[0]!.id;
      const result = await exec(tools, "updateExperienceBullet", {
        experienceId: expId,
        index: 999,
        text: "x",
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("formations", () => {
    it("adds and removes a formation", async () => {
      const { state, tools } = buildAssistantTools(sampleCv);
      const before = state.cv.formations.length;
      const addRes = await exec(tools, "addFormation", {
        formation: {
          degree: "Master Info",
          school: "ENS Lyon",
          startDate: "2026-09",
        },
      });
      expect(addRes.ok).toBe(true);
      if (!addRes.ok) return;
      const newId = state.cv.formations[before]!.id;
      expect(newId).toMatch(/^form_/);

      const rmRes = await exec(tools, "removeFormation", { id: newId });
      expect(rmRes.ok).toBe(true);
      expect(state.cv.formations.length).toBe(before);
    });
  });

  describe("simple sections", () => {
    it("adds a skill, language, and interest", async () => {
      const { state, tools } = buildAssistantTools(sampleCv);
      const s = await exec(tools, "addSkill", {
        item: { name: "Rust", level: "intermédiaire", category: "Langages" },
      });
      expect(s.ok).toBe(true);
      expect(state.cv.skills.some((x) => x.name === "Rust")).toBe(true);

      const l = await exec(tools, "addLanguage", {
        item: { name: "Allemand", level: "B2" },
      });
      expect(l.ok).toBe(true);
      expect(state.cv.languages.some((x) => x.name === "Allemand")).toBe(true);

      const i = await exec(tools, "addInterest", {
        item: { name: "Course à pied" },
      });
      expect(i.ok).toBe(true);
      expect(state.cv.interests.some((x) => x.name === "Course à pied")).toBe(true);
    });
  });
});
