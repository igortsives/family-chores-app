-- Align DB schema with current Prisma schema for fresh CI databases
-- while remaining safe on existing environments where some objects already exist.

-- User auth/admin columns introduced after the original baseline migration.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- Backfill usernames for any pre-existing rows before enforcing NOT NULL + uniqueness.
UPDATE "User"
SET "username" = lower(split_part("email", '@', 1)) || '_' || substr("id", 1, 6)
WHERE "username" IS NULL;

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

-- Star exchange/status models (used by awards + notifications) may be missing on fresh DBs.
DO $$
BEGIN
  CREATE TYPE "StarExchangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "StarWeek" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "earned" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StarWeek_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StarExchange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "note" TEXT,
    "status" "StarExchangeStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    CONSTRAINT "StarExchange_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StarWeek_userId_weekStart_key" ON "StarWeek"("userId", "weekStart");
CREATE INDEX IF NOT EXISTS "StarWeek_weekStart_idx" ON "StarWeek"("weekStart");
CREATE INDEX IF NOT EXISTS "StarExchange_userId_status_idx" ON "StarExchange"("userId", "status");

DO $$
BEGIN
  ALTER TABLE "StarWeek"
    ADD CONSTRAINT "StarWeek_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "StarExchange"
    ADD CONSTRAINT "StarExchange_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "StarExchange"
    ADD CONSTRAINT "StarExchange_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
