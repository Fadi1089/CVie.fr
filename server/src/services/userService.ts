import { prisma } from "../lib/prisma";
import { Prisma } from "../../../prisma/generated/prisma/client";
import type { User } from "../../../prisma/generated/prisma/client";

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
  if (typeof target === "string") return target === "auth0_sub" || target.includes("auth0_sub");
  return false;
}

export async function upsertUserByAuth0Sub(claims: Auth0Claims): Promise<AppUser> {
  if (!claims.sub) {
    throw new Error("Auth0 claims missing required `sub`.");
  }
  const args = {
    where: { auth0Sub: claims.sub },
    create: { auth0Sub: claims.sub, email: claims.email },
    update: { email: claims.email },
  };
  try {
    return (await prisma.user.upsert(args)) as AppUser;
  } catch (err) {
    if (isAuth0SubConflict(err)) {
      return (await prisma.user.upsert(args)) as AppUser;
    }
    throw err;
  }
}
