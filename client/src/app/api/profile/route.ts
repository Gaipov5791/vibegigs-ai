import { after, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runParseAndAnalyze } from "@/lib/ai/processPendingJobs";
import { ensureProfile } from "@/lib/profile";
import {
  DEFAULT_BIO,
  parseProfileRecord,
} from "@/lib/profileDefaults";
import { isPlatformOption, type PlatformOption } from "@/lib/platforms";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const profile = await ensureProfile(auth.user.id, auth.user.email);
    return NextResponse.json(parseProfileRecord(profile));
  } catch (error) {
    console.error("[GET /api/profile]", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { tech_stack, stop_words, bio, selected_platform } =
      (await request.json()) as {
        tech_stack?: string[];
        stop_words?: string[];
        bio?: string;
        selected_platform?: string;
      };

    if (
      !Array.isArray(tech_stack) ||
      !Array.isArray(stop_words) ||
      typeof bio !== "string" ||
      (selected_platform !== undefined && !isPlatformOption(selected_platform))
    ) {
      return NextResponse.json({ error: "Invalid profile payload" }, { status: 400 });
    }

    await ensureProfile(auth.user.id, auth.user.email);

    const previousProfile = await prisma.profile.findUnique({
      where: { id: auth.user.id },
      select: { selected_platform: true },
    });

    const profile = await prisma.profile.update({
      where: { id: auth.user.id },
      data: {
        tech_stack,
        stop_words,
        bio: bio.trim() || DEFAULT_BIO,
        ...(selected_platform !== undefined && { selected_platform }),
      },
    });

    const platformChanged =
      selected_platform !== undefined &&
      selected_platform !== previousProfile?.selected_platform;

    if (platformChanged) {
      const platform = selected_platform as PlatformOption;
      const userId = auth.user.id;

      after(async () => {
        try {
          await runParseAndAnalyze(platform, userId);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(
            `[PUT /api/profile] Background parse failed for ${platform}: ${message}`
          );
        }
      });
    }

    return NextResponse.json(parseProfileRecord(profile));
  } catch (error) {
    console.error("[PUT /api/profile]", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
