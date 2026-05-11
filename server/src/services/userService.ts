import { prisma } from "../lib/prisma";
import { Prisma } from "../../../prisma/generated/prisma/client";
import type { User } from "../../../prisma/generated/prisma/client";
import { seedSystemFolders } from "./folderService";

export type AppUser = User;

export type Auth0Claims = {
  sub: string;
  email: string;
  email_verified?: boolean;
};

function isAuth0SubConflict(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== "P2002") return false;
  const target = err.meta?.target;
  if (Array.isArray(target)) return target.includes("auth0_sub");
  if (typeof target === "string")
    return target === "auth0_sub" || target.includes("auth0_sub");
  return false;
}

export async function getUserIdByAuth0Sub(sub: string): Promise<string | null> {
  const row = await prisma.user.findUnique({
    where: { auth0Sub: sub },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function upsertUserByAuth0Sub(claims: Auth0Claims): Promise<AppUser> {
  if (!claims.sub) {
    throw new Error("Auth0 claims missing required `sub`.");
  }

  // Detect "is new user" by checking before upsert.
  const existing = await prisma.user.findUnique({
    where: { auth0Sub: claims.sub },
    select: { id: true },
  });

  const args = {
    where: { auth0Sub: claims.sub },
    create: { auth0Sub: claims.sub, email: claims.email },
    update: { email: claims.email },
  };

  let user: AppUser;
  try {
    user = (await prisma.user.upsert(args)) as AppUser;
  } catch (err) {
    if (isAuth0SubConflict(err)) {
      user = (await prisma.user.upsert(args)) as AppUser;
    } else {
      throw err;
    }
  }

  if (!existing) {
    // First time we've seen this auth0Sub — seed the system folders.
    // Idempotent guard: caller may retry the whole upsert on transient
    // failures; if seeding partially succeeded last time the unique
    // (userId, name) constraint will surface here. Swallow that case.
    try {
      await seedSystemFolders(user.id);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        // Already seeded — fine.
      } else {
        throw err;
      }
    }
  }

  return user;
}
