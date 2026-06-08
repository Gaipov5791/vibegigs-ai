-- DropIndex
DROP INDEX "AnalyzedJob_rawJobId_key";

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "selected_platform" TEXT NOT NULL DEFAULT 'We Work Remotely';
