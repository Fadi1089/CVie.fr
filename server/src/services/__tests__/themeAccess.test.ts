import { describe, it, expect } from "bun:test";
import { canUseTheme } from "../themeAccess";
import { themeRegistry } from "@cvie/shared";

const classique = themeRegistry.find((t) => t.meta.id === "atelier-classique")!;
const premiumMeta = { ...classique.meta, tier: "premium" as const };

describe("canUseTheme", () => {
  it("permits free themes for anonymous users", () => {
    expect(canUseTheme(classique.meta, undefined)).toBe(true);
  });
  it("permits free themes for free-tier users", () => {
    expect(canUseTheme(classique.meta, { tier: "free" })).toBe(true);
  });
  it("denies premium themes for anonymous users", () => {
    expect(canUseTheme(premiumMeta, undefined)).toBe(false);
  });
  it("denies premium themes for free-tier users", () => {
    expect(canUseTheme(premiumMeta, { tier: "free" })).toBe(false);
  });
  it("permits premium themes for premium-tier users", () => {
    expect(canUseTheme(premiumMeta, { tier: "premium" })).toBe(true);
  });
});
