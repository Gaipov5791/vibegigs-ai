import { after, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { runParseAndAnalyze } from "@/lib/ai/processPendingJobs";
import { getUserSelectedPlatform } from "@/lib/profilePlatform";
import { isPlatformOption, type PlatformOption } from "@/lib/platforms";

export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      platform?: string;
    };

    let platform: PlatformOption;

    if (body.platform !== undefined) {
      if (!isPlatformOption(body.platform)) {
        return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
      }
      platform = body.platform;
    } else {
      platform = await getUserSelectedPlatform(auth.user.id);
    }

    const userId = auth.user.id;

    after(async () => {
      try {
        const result = await runParseAndAnalyze(platform, userId);
        console.log(
          `[POST /api/jobs/parse] Completed for ${auth.user.email} on ${platform}: analyzed ${result.analyzedCount} jobs`
        );
      } catch (error) {
        console.error("[POST /api/jobs/parse] Background job failed:", error);
      }
    });

    return NextResponse.json(
      { status: "accepted", platform, message: "Parse and analysis started" },
      { status: 202 }
    );
  } catch (error) {
    console.error("[POST /api/jobs/parse]", error);
    return NextResponse.json(
      { error: "Failed to start parse job" },
      { status: 500 }
    );
  }
}
