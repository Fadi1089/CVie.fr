-- CreateTable
CREATE TABLE "master_cvs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_cvs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_ai_instructions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "text" VARCHAR(4000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_ai_instructions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_cvs_user_id_key" ON "master_cvs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_ai_instructions_user_id_key" ON "user_ai_instructions"("user_id");

-- AddForeignKey
ALTER TABLE "master_cvs" ADD CONSTRAINT "master_cvs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ai_instructions" ADD CONSTRAINT "user_ai_instructions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
