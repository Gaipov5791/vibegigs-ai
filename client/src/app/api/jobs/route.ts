import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeJob } from "@/lib/jobs";
import { getUserSelectedPlatform } from "@/lib/profilePlatform";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const userId = auth.user.id;
    const selectedPlatform = await getUserSelectedPlatform(userId);

    const jobs = await prisma.analyzedJob.findMany({
      where: {
        userId,
        rawJob: { platform: selectedPlatform },
      },
      include: { rawJob: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(jobs.map(serializeJob));
  } catch (error) {
    console.error("[GET /api/jobs]", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
