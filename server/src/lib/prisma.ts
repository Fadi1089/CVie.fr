import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../../../prisma/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const adapter = new PrismaNeon({ connectionString });
export const prisma = new PrismaClient({ adapter });
