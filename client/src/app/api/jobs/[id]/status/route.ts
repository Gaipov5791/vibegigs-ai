import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALLOWED_STATUSES, serializeJob, type AllowedJobStatus } from "@/lib/jobs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await params;
  const { status } = (await request.json()) as { status?: string };
  const userId = auth.user.id;

  if (!status || !ALLOWED_STATUSES.includes(status as AllowedJobStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const analyzed = await prisma.analyzedJob.findFirst({
      where: { id, userId },
      include: { rawJob: true },
    });

    if (!analyzed) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const updatedRawJob = await prisma.rawJob.update({
      where: { id: analyzed.rawJobId },
      data: { status },
    });

    return NextResponse.json(
      serializeJob({ ...analyzed, rawJob: updatedRawJob })
    );
  } catch (error) {
    console.error("[POST /api/jobs/:id/status]", error);
    return NextResponse.json(
      { error: "Failed to update job status" },
      { status: 500 }
    );
  }
}
