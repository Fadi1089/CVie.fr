import type { ThemeMeta } from "@cvie/shared";
import type { UserTierContext } from "./userTier";

export function canUseTheme(theme: ThemeMeta, user: UserTierContext): boolean {
  if (theme.tier === "free") return true;
  return user?.tier === "premium";
}
