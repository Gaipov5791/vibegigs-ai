import { analyzeJob } from "./analyzer";
import { prisma } from "../lib/prisma";
import { parseProfileRecord } from "../lib/profileDefaults";

const POLL_INTERVAL_MS = 30_000;

async function processNextPendingJob(): Promise<void> {
  const profiles = await prisma.profile.findMany();

  if (profiles.length === 0) {
    return;
  }

  for (const profileRecord of profiles) {
    const profile = parseProfileRecord(profileRecord);

    const rawJob = await prisma.rawJob.findFirst({
      where: {
        status: "pending",
        analyzedJobs: { none: { userId: profile.id } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!rawJob) {
      continue;
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

      return;
    } catch (error) {
      console.error(
        `[aiWorker] Failed to analyze job ${rawJob.id} for ${profile.email}:`,
        error
      );

      await prisma.rawJob.update({
        where: { id: rawJob.id },
        data: { status: "failed" },
      });

      return;
    }
  }
}

export function startAiWorker(): void {
  console.log(
    `[aiWorker] Started — polling every ${POLL_INTERVAL_MS / 1000}s for pending jobs`
  );

  void processNextPendingJob();

  setInterval(() => {
    void processNextPendingJob();
  }, POLL_INTERVAL_MS);
}
