import { prisma } from "../lib/prisma";

export type Auth0Claims = {
  sub: string;
  email: string;
  email_verified?: boolean;
};

export type AppUser = {
  id: string;
  auth0Sub: string;
  email: string;
  username: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

function isUniqueConflict(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "P2002"
  );
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
    if (isUniqueConflict(err)) {
      return (await prisma.user.upsert(args)) as AppUser;
    }
    throw err;
  }
}
