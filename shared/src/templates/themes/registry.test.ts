import { describe, it, expect } from "vitest";
import { themeRegistry, getTheme, requireTheme, listThemes } from "./index";

describe("themeRegistry", () => {
  it("contains atelier-classique", () => {
    expect(themeRegistry.find((t) => t.meta.id === "atelier-classique")).toBeDefined();
  });
  it("has unique ids", () => {
    const ids = themeRegistry.map((t) => t.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getTheme", () => {
  it("returns the theme by id", () => {
    expect(getTheme("atelier-classique")?.meta.id).toBe("atelier-classique");
  });
  it("returns undefined for unknown ids", () => {
    expect(getTheme("does-not-exist")).toBeUndefined();
  });
});

describe("requireTheme", () => {
  it("throws on unknown ids with a helpful message", () => {
    expect(() => requireTheme("nope")).toThrow(/unknown theme/i);
  });
});

describe("listThemes", () => {
  it("returns the meta block of every theme (no render function leak)", () => {
    const list = listThemes();
    expect(list[0]).toHaveProperty("id");
    expect(list[0]).not.toHaveProperty("render");
  });
});
