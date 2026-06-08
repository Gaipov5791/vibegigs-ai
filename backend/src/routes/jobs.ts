import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getUserSelectedPlatform } from "../lib/profilePlatform";
import { requireAuth, type AuthRequest } from "../middleware/auth";

export const jobsRouter = Router();

jobsRouter.use(requireAuth);

const ALLOWED_STATUSES = ["processed", "applied", "archived"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function serializeJob(
  analyzed: {
    id: string;
    rawJobId: string;
    match_percentage: number;
    estimatedPriceUsd: number | null;
    estimatedDays: number | null;
    ai_summary: string;
    red_flags: unknown;
    tech_stack: unknown;
    cover_letter_expert: string;
    direct_apply_link: string | null;
    createdAt: Date;
    rawJob: {
      title: string;
      description: string;
      platform: string;
      budget: string | null;
      url: string;
      applyUrl: string | null;
      status: string;
    };
  }
) {
  return {
    id: analyzed.id,
    rawJobId: analyzed.rawJobId,
    title: analyzed.rawJob.title,
    description: analyzed.rawJob.description,
    platform: analyzed.rawJob.platform,
    budget: analyzed.rawJob.budget,
    url: analyzed.rawJob.url,
    apply_url: analyzed.rawJob.applyUrl,
    direct_apply_link: analyzed.direct_apply_link,
    status: analyzed.rawJob.status,
    match_percentage: analyzed.match_percentage,
    estimated_price_usd: analyzed.estimatedPriceUsd,
    estimated_days: analyzed.estimatedDays,
    ai_summary: analyzed.ai_summary,
    red_flags: analyzed.red_flags as string[],
    tech_stack: analyzed.tech_stack as string[],
    cover_letter_expert: analyzed.cover_letter_expert,
    createdAt: analyzed.createdAt.toISOString(),
  };
}

jobsRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const selectedPlatform = await getUserSelectedPlatform(userId);

    const jobs = await prisma.analyzedJob.findMany({
      where: {
        userId,
        rawJob: { platform: selectedPlatform },
      },
      include: { rawJob: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(jobs.map(serializeJob));
  } catch (error) {
    console.error("[GET /api/jobs]", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

jobsRouter.post("/:id/status", async (req: AuthRequest, res) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { status } = req.body as { status?: string };
  const userId = req.user!.id;

  if (!status || !ALLOWED_STATUSES.includes(status as AllowedStatus)) {
    res.status(400).json({
      error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}`,
    });
    return;
  }

  try {
    const analyzed = await prisma.analyzedJob.findFirst({
      where: { id: id!, userId },
      include: { rawJob: true },
    });

    if (!analyzed) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const updatedRawJob = await prisma.rawJob.update({
      where: { id: analyzed.rawJobId },
      data: { status },
    });

    res.json({
      ...serializeJob({ ...analyzed, rawJob: updatedRawJob }),
    });
  } catch (error) {
    console.error("[POST /api/jobs/:id/status]", error);
    res.status(500).json({ error: "Failed to update job status" });
  }
});
