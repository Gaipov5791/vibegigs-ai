/*
  Warnings:

  - Added the required column `tech_stack` to the `AnalyzedJob` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AnalyzedJob" ADD COLUMN     "tech_stack" JSONB NOT NULL;
