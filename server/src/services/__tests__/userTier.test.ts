import { describe, it, expect, beforeEach, mock } from "bun:test";
import { prisma } from "../../lib/prisma";
import { resolveUserTier, __resetUserTierCacheForTests } from "../userTier";

beforeEach(() => {
  __resetUserTierCacheForTests();
});

describe("resolveUserTier", () => {
  it("returns undefined when no claims are present", async () => {
    expect(await resolveUserTier(null)).toBeUndefined();
  });

  it("returns { tier: 'free' } when the User row has tier='free'", async () => {
    const findUnique = mock(() => Promise.resolve({ tier: "free" }));
    (prisma.user as unknown as { findUnique: typeof findUnique }).findUnique = findUnique;
    const out = await resolveUserTier({ sub: "auth0|1", email: "a@b.c" });
    expect(out).toEqual({ tier: "free" });
  });

  it("returns { tier: 'premium' } when the User row has tier='premium'", async () => {
    const findUnique = mock(() => Promise.resolve({ tier: "premium" }));
    (prisma.user as unknown as { findUnique: typeof findUnique }).findUnique = findUnique;
    const out = await resolveUserTier({ sub: "auth0|2", email: "p@b.c" });
    expect(out).toEqual({ tier: "premium" });
  });

  it("returns undefined when the User row is not found (fail-safe = anon)", async () => {
    const findUnique = mock(() => Promise.resolve(null));
    (prisma.user as unknown as { findUnique: typeof findUnique }).findUnique = findUnique;
    expect(await resolveUserTier({ sub: "auth0|gone", email: "x@x" })).toBeUndefined();
  });

  it("caches the lookup for the TTL window", async () => {
    let calls = 0;
    const findUnique = mock(() => {
      calls += 1;
      return Promise.resolve({ tier: "premium" });
    });
    (prisma.user as unknown as { findUnique: typeof findUnique }).findUnique = findUnique;
    await resolveUserTier({ sub: "auth0|3", email: "a@b" });
    await resolveUserTier({ sub: "auth0|3", email: "a@b" });
    expect(calls).toBe(1);
  });
});
