// shared/src/templates/themes/atelier-moderne/index.test.ts
import { describe, it, expect } from "vitest";
import { atelierModerne } from "./index";

describe("atelierModerne.meta", () => {
  it("is identified by 'atelier-moderne'", () => {
    expect(atelierModerne.meta.id).toBe("atelier-moderne");
  });
  it("is in the premium tier", () => {
    expect(atelierModerne.meta.tier).toBe("premium");
  });
  it("declares ats-balanced as its narrowest mode (two-column layout)", () => {
    expect(atelierModerne.meta.atsProfile.minSupported).toBe("ats-balanced");
  });
});
