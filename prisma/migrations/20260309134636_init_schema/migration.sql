/*
  Warnings:

  - You are about to drop the column `hackthonName` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `requiredSkills` on the `Team` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[teamId,receiverId]` on the table `Match` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[teamId,userId]` on the table `TeamMember` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `teamId` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hackathonName` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProficiencyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'EXPERT');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('FORMING', 'ACTIVE', 'SUBMITTED', 'DISBANDED');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "teamId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "hackthonName",
DROP COLUMN "requiredSkills",
ADD COLUMN     "hackathonName" TEXT NOT NULL,
ADD COLUMN     "maxSize" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "status" "TeamStatus" NOT NULL DEFAULT 'FORMING';

-- AlterTable
ALTER TABLE "UserSkill" ADD COLUMN     "proficiency" "ProficiencyLevel" NOT NULL DEFAULT 'BEGINNER';

-- CreateTable
CREATE TABLE "TeamRequiredSkill" (
    "teamId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "TeamRequiredSkill_pkey" PRIMARY KEY ("teamId","skillId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Match_teamId_receiverId_key" ON "Match"("teamId", "receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- AddForeignKey
ALTER TABLE "TeamRequiredSkill" ADD CONSTRAINT "TeamRequiredSkill_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRequiredSkill" ADD CONSTRAINT "TeamRequiredSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
