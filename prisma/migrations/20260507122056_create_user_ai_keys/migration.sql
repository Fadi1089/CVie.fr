-- CreateTable
CREATE TABLE "user_ai_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "iv" BYTEA NOT NULL,
    "auth_tag" BYTEA NOT NULL,
    "key_hint" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_ai_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_ai_keys_user_id_idx" ON "user_ai_keys"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_ai_keys_user_id_provider_key" ON "user_ai_keys"("user_id", "provider");

-- AddForeignKey
ALTER TABLE "user_ai_keys" ADD CONSTRAINT "user_ai_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
