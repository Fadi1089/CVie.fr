import { prisma } from "../lib/prisma";
import type { Auth0Claims } from "./userService";

export type UserTier = "free" | "premium";
export type UserTierContext = { tier: UserTier } | undefined;

// Same 5-minute TTL as the optionalAuth upsert cache. Keyed by Auth0 sub.
const TIER_CACHE = new Map<string, { tier: UserTier; expiresAt: number }>();
const TTL_MS = 5 * 60_000;

export function __resetUserTierCacheForTests(): void {
  TIER_CACHE.clear();
}

export async function resolveUserTier(
  claims: Auth0Claims | null,
): Promise<UserTierContext> {
  if (!claims) return undefined;

  const hit = TIER_CACHE.get(claims.sub);
  if (hit && hit.expiresAt > Date.now()) return { tier: hit.tier };

  const row = await prisma.user.findUnique({
    where: { auth0Sub: claims.sub },
    select: { tier: true },
  });
  if (!row) return undefined;

  // Defensive: normalize anything unexpected back to 'free'.
  const tier: UserTier = row.tier === "premium" ? "premium" : "free";
  TIER_CACHE.set(claims.sub, { tier, expiresAt: Date.now() + TTL_MS });
  return { tier };
}
