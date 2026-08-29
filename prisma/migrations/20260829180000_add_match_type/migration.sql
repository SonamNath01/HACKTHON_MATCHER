-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('INVITATION', 'JOIN_REQUEST');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "type" "MatchType" NOT NULL DEFAULT 'INVITATION';
