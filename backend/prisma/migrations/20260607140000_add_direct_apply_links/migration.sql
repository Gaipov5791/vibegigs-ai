-- AlterTable
ALTER TABLE "RawJob" ADD COLUMN "applyUrl" TEXT;

-- AlterTable
ALTER TABLE "AnalyzedJob" ADD COLUMN "direct_apply_link" TEXT;
