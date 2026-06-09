import { analyzeJob } from "./analyzer";
import { prisma } from "@/lib/prisma";
import { parseProfileRecord } from "@/lib/profileDefaults";
import type { PlatformOption } from "@/lib/platforms";
import { runParserForPlatform } from "@/lib/parser/parserScheduler";

const MAX_JOBS_PER_RUN = 10;

async function processNextPendingJobForUser(userId: string): Promise<boolean> {
  const profileRecord = await prisma.profile.findUnique({
    where: { id: userId },
  });

  if (!profileRecord) {
    return false;
  }

  const profile = parseProfileRecord(profileRecord);
  const selectedPlatform = profile.selected_platform;

  const rawJob = await prisma.rawJob.findFirst({
    where: {
      status: "pending",
      platform: selectedPlatform,
      analyzedJobs: { none: { userId } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!rawJob) {
    return false;
  }

  console.log(
    `[aiWorker] Analyzing job ${rawJob.id} for user ${profile.email} — "${rawJob.title}"`
  );

  try {
    const analysis = await analyzeJob(
      rawJob.description,
      rawJob.title,
      profile
    );

    await prisma.analyzedJob.create({
      data: {
        rawJobId: rawJob.id,
        userId: profile.id,
        match_percentage: analysis.match_percentage,
        estimatedPriceUsd: analysis.estimated_price_usd || null,
        estimatedDays: analysis.estimated_days || null,
        ai_summary: analysis.ai_summary,
        red_flags: analysis.red_flags,
        tech_stack: analysis.tech_stack,
        cover_letter_expert: analysis.cover_letter_expert,
        direct_apply_link:
          analysis.direct_apply_link || rawJob.applyUrl || null,
      },
    });

    const remainingProfiles = await prisma.profile.count({
      where: {
        analyzedJobs: { none: { rawJobId: rawJob.id } },
      },
    });

    if (remainingProfiles === 0) {
      await prisma.rawJob.update({
        where: { id: rawJob.id },
        data: { status: "processed" },
      });
    }

    console.log(
      `[aiWorker] Processed job ${rawJob.id} for ${profile.email} (match: ${analysis.match_percentage}%)`
    );

    return true;
  } catch (error) {
    console.error(
      `[aiWorker] Failed to analyze job ${rawJob.id} for ${profile.email}:`,
      error
    );

    await prisma.rawJob.update({
      where: { id: rawJob.id },
      data: { status: "failed" },
    });

    return false;
  }
}

export async function processPendingJobsForUser(
  userId: string,
  limit = MAX_JOBS_PER_RUN
): Promise<number> {
  let processed = 0;

  for (let i = 0; i < limit; i++) {
    const didProcess = await processNextPendingJobForUser(userId);
    if (!didProcess) {
      break;
    }
    processed++;
  }

  return processed;
}

export async function runParseAndAnalyze(
  platform: PlatformOption,
  userId: string
): Promise<{ parsed: boolean; analyzedCount: number }> {
  await runParserForPlatform(platform);
  const analyzedCount = await processPendingJobsForUser(userId);
  return { parsed: true, analyzedCount };
}
