-- Optional profile image per family member.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
