// shared/src/templates/themes/types.test.ts
import { describe, it, expectTypeOf } from "vitest";
import type {
  Theme,
  ThemeMeta,
  ThemeCustomization,
  ThemeRenderOptions,
} from "./types";
import type { JsonResume } from "../jsonResume/schema";

describe("theme types (compile-time only)", () => {
  it("Theme has a render function returning a string", () => {
    expectTypeOf<Theme["render"]>().parameters.toEqualTypeOf<
      [JsonResume, ThemeRenderOptions]
    >();
    expectTypeOf<Theme["render"]>().returns.toEqualTypeOf<string>();
  });

  it("ThemeMeta declares id, name, description, tier, atsProfile", () => {
    expectTypeOf<ThemeMeta>().toHaveProperty("id");
    expectTypeOf<ThemeMeta>().toHaveProperty("tier");
    expectTypeOf<ThemeMeta>().toHaveProperty("atsProfile");
  });

  it("ThemeRenderOptions carries atsMode, customization, locale", () => {
    expectTypeOf<ThemeRenderOptions>().toHaveProperty("atsMode");
    expectTypeOf<ThemeRenderOptions>().toHaveProperty("customization");
    expectTypeOf<ThemeRenderOptions>().toHaveProperty("locale");
  });

  it("ThemeCustomization is theme-defined and constrained", () => {
    type Sample = ThemeCustomization<{ accent: string; density: "compact" | "comfy" }>;
    expectTypeOf<Sample>().toHaveProperty("accent");
    expectTypeOf<Sample>().toHaveProperty("density");
  });
});
