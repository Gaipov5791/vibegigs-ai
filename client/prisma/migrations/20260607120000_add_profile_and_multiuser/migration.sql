-- Clear old local market jobs
DELETE FROM "AnalyzedJob";
DELETE FROM "RawJob";

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tech_stack" JSONB NOT NULL DEFAULT '[]',
    "stop_words" JSONB NOT NULL DEFAULT '[]',
    "bio" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- Drop old unique constraint on rawJobId
ALTER TABLE "AnalyzedJob" DROP CONSTRAINT IF EXISTS "AnalyzedJob_rawJobId_key";

-- Add userId column
ALTER TABLE "AnalyzedJob" ADD COLUMN "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyzedJob_rawJobId_userId_key" ON "AnalyzedJob"("rawJobId", "userId");

-- AddForeignKey
ALTER TABLE "AnalyzedJob" ADD CONSTRAINT "AnalyzedJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
