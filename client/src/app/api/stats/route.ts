import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAY_LABELS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const userId = auth.user.id;

    const [analyzedJobs, pendingCount, appliedCount] = await Promise.all([
      prisma.analyzedJob.findMany({
        where: { userId },
        include: { rawJob: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.rawJob.count({ where: { status: "pending" } }),
      prisma.rawJob.count({
        where: {
          status: "applied",
          analyzedJobs: { some: { userId } },
        },
      }),
    ]);

    const activeJobs = analyzedJobs.filter(
      (j) => j.rawJob.status !== "archived"
    );

    const totalAnalyzed = activeJobs.length;
    const averageMatch =
      totalAnalyzed > 0
        ? Math.round(
            (activeJobs.reduce((sum, j) => sum + j.match_percentage, 0) /
              totalAnalyzed) *
              10
          ) / 10
        : 0;

    const highMatchCount = activeJobs.filter(
      (j) => j.match_percentage >= 80
    ).length;

    const jobsWithPrice = activeJobs.filter((j) => j.estimatedPriceUsd != null);
    const jobsWithDays = activeJobs.filter((j) => j.estimatedDays != null);

    const averageEstimatedPriceUsd =
      jobsWithPrice.length > 0
        ? Math.round(
            jobsWithPrice.reduce(
              (sum, j) => sum + (j.estimatedPriceUsd ?? 0),
              0
            ) / jobsWithPrice.length
          )
        : null;

    const averageEstimatedDays =
      jobsWithDays.length > 0
        ? Math.round(
            jobsWithDays.reduce((sum, j) => sum + (j.estimatedDays ?? 0), 0) /
              jobsWithDays.length
          )
        : null;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const weeklyBuckets = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return {
        date,
        day: DAY_LABELS[date.getDay()],
        count: 0,
        totalMatch: 0,
      };
    });

    for (const job of analyzedJobs) {
      const created = new Date(job.createdAt);
      if (created < weekStart) continue;

      const dayIndex = Math.floor(
        (created.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (dayIndex >= 0 && dayIndex < 7) {
        weeklyBuckets[dayIndex].count += 1;
        weeklyBuckets[dayIndex].totalMatch += job.match_percentage;
      }
    }

    const weeklyMatches = weeklyBuckets.map((bucket) => ({
      day: bucket.day,
      count: bucket.count,
      avgMatch:
        bucket.count > 0 ? Math.round(bucket.totalMatch / bucket.count) : 0,
    }));

    return NextResponse.json({
      totalAnalyzed,
      averageMatch,
      appliedCount,
      highMatchCount,
      pendingCount,
      averageEstimatedPriceUsd,
      averageEstimatedDays,
      weeklyMatches,
    });
  } catch (error) {
    console.error("[GET /api/stats]", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
