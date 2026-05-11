import path from "node:path";
import { defineConfig, env } from "prisma/config";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun run prisma/seed.ts",
  },
  // Prisma 7 removed `datasource.directUrl`; the CLI uses `url` for
  // migrations. Supabase's transaction pooler (6543) doesn't support the
  // session-level operations migrate needs, so point this at DIRECT_URL
  // (session pooler / 5432). Runtime queries still use DATABASE_URL via
  // the PrismaNeon adapter in server/src/lib/prisma.ts.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
