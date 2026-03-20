/*
  Warnings:

  - The values [WEEKENDS] on the enum `AvailabilityType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `relibilityScore` on the `User` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AvailabilityType_new" AS ENUM ('FULL_TIME', 'PART_TIME', 'WEEKENDS_ONLY');
ALTER TABLE "public"."User" ALTER COLUMN "availability" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "availability" TYPE "AvailabilityType_new" USING ("availability"::text::"AvailabilityType_new");
ALTER TYPE "AvailabilityType" RENAME TO "AvailabilityType_old";
ALTER TYPE "AvailabilityType_new" RENAME TO "AvailabilityType";
DROP TYPE "public"."AvailabilityType_old";
ALTER TABLE "User" ALTER COLUMN "availability" SET DEFAULT 'FULL_TIME';
COMMIT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "relibilityScore",
ADD COLUMN     "reliabilityScore" INTEGER NOT NULL DEFAULT 50;
