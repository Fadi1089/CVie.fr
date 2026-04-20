import { describe, expect, it } from "vitest";
import { sampleCv } from "../cv/defaults";
import { renderCvHtml, type TemplateId } from "./renderer";
import { templateRegistry } from "./registry";

describe("templateRegistry", () => {
  it("exposes exactly 3 templates (Classique, Moderne, Minimaliste)", () => {
    expect(templateRegistry).toHaveLength(3);
    expect(templateRegistry.map((t) => t.id)).toEqual([
      "classique",
      "moderne",
      "minimaliste",
    ]);
  });

  it("has a non-empty French name and description for each template", () => {
    for (const t of templateRegistry) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.atsCompatible).toBe(true);
    }
  });

  it("every registry id is a valid TemplateId that renders non-empty HTML", () => {
    for (const t of templateRegistry) {
      const id: TemplateId = t.id;
      const html = renderCvHtml(sampleCv, id);
      expect(html.length).toBeGreaterThan(500);
      expect(html).toContain("Yasmine Benali");
    }
  });
});
