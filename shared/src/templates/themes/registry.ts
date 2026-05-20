import type { Theme } from "./types";
import { communityStackoverflow } from "./community-stackoverflow/index";

// Single-theme registry — the atelier-* folders still exist on disk but are
// dead code from the user's perspective. Their internal tests still pass in
// isolation; nothing in the rendering / theme-selection pipeline reaches them
// anymore. Leave them around for one release in case we need to roll back the
// purge without re-vendoring the old in-house themes.
export const themeRegistry: readonly Theme[] = [communityStackoverflow];
