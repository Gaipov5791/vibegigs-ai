-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "RawJob" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budget" TEXT,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyzedJob" (
    "id" TEXT NOT NULL,
    "rawJobId" TEXT NOT NULL,
    "match_percentage" DOUBLE PRECISION NOT NULL,
    "ai_summary" TEXT NOT NULL,
    "red_flags" JSONB NOT NULL,
    "cover_letter_expert" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyzedJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RawJob_url_key" ON "RawJob"("url");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyzedJob_rawJobId_key" ON "AnalyzedJob"("rawJobId");

-- AddForeignKey
ALTER TABLE "AnalyzedJob" ADD CONSTRAINT "AnalyzedJob_rawJobId_fkey" FOREIGN KEY ("rawJobId") REFERENCES "RawJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
