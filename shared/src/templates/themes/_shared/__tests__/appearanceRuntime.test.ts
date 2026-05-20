import { describe, it, expect } from "vitest";
import { APPEARANCE_RUNTIME_SCRIPT } from "../appearanceRuntime";

describe("APPEARANCE_RUNTIME_SCRIPT", () => {
  it("recognises the new cv-line-height-deltas message", () => {
    expect(APPEARANCE_RUNTIME_SCRIPT).toContain('"cv-line-height-deltas"');
  });

  it("recognises the new cv-typography message", () => {
    expect(APPEARANCE_RUNTIME_SCRIPT).toContain('"cv-typography"');
  });

  it("no longer handles the legacy singular cv-line-height-delta", () => {
    // The new plural handler covers the same surface; the singular type is gone.
    expect(APPEARANCE_RUNTIME_SCRIPT).not.toContain('"cv-line-height-delta"');
  });

  it("includes the link palette channel", () => {
    expect(APPEARANCE_RUNTIME_SCRIPT).toContain('link:');
    expect(APPEARANCE_RUNTIME_SCRIPT).toContain('"--cv-link"');
  });

  it("knows the 8 text roles", () => {
    for (const role of ["name","label","section","title","card","body","meta","fine"]) {
      expect(APPEARANCE_RUNTIME_SCRIPT).toContain(`"${role}"`);
    }
  });

  it("no longer hardcodes the old 3-role text key list", () => {
    expect(APPEARANCE_RUNTIME_SCRIPT).not.toMatch(/\["paragraph","header","title"\]/);
  });
});
