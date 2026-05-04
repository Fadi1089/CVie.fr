-- AlterTable
ALTER TABLE "users" DROP COLUMN "password_hash";

-- AlterTable
ALTER TABLE "users" ADD COLUMN "auth0_sub" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_auth0_sub_key" ON "users"("auth0_sub");
