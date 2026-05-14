import { themeRegistry } from "./registry";
import type { Theme, ThemeMeta } from "./types";

export { themeRegistry };
export type { Theme, ThemeMeta };
export type { AtsMode, ThemeTier, AtsProfile, ThemeRenderOptions } from "./types";

export function getTheme(id: string): Theme | undefined {
  return themeRegistry.find((t) => t.meta.id === id);
}

export function requireTheme(id: string): Theme {
  const t = getTheme(id);
  if (!t) throw new Error(`Unknown theme: ${id}`);
  return t;
}

export function listThemes(): readonly ThemeMeta[] {
  return themeRegistry.map((t) => t.meta);
}
