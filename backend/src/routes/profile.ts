import { Router } from "express";
import { prisma } from "../lib/prisma";
import {
  DEFAULT_BIO,
  DEFAULT_STOP_WORDS,
  DEFAULT_TECH_STACK,
  parseProfileRecord,
} from "../lib/profileDefaults";
import { isPlatformOption, type PlatformOption } from "../lib/platforms";
import { runParserForPlatform } from "../parser/parserScheduler";
import { requireAuth, type AuthRequest } from "../middleware/auth";

export const profileRouter = Router();

profileRouter.use(requireAuth);

async function ensureProfile(userId: string, email: string) {
  return prisma.profile.upsert({
    where: { id: userId },
    update: { email },
    create: {
      id: userId,
      email,
      tech_stack: DEFAULT_TECH_STACK,
      stop_words: DEFAULT_STOP_WORDS,
      bio: DEFAULT_BIO,
    },
  });
}

profileRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const profile = await ensureProfile(user.id, user.email);
    res.json(parseProfileRecord(profile));
  } catch (error) {
    console.error("[GET /api/profile]", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

profileRouter.put("/", async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { tech_stack, stop_words, bio, selected_platform } = req.body as {
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
      res.status(400).json({ error: "Invalid profile payload" });
      return;
    }

    await ensureProfile(user.id, user.email);

    const previousProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { selected_platform: true },
    });

    const profile = await prisma.profile.update({
      where: { id: user.id },
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
      void runParserForPlatform(platform).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `[PUT /api/profile] Immediate parser failed for ${platform}: ${message}`
        );
      });
    }

    res.json(parseProfileRecord(profile));
  } catch (error) {
    console.error("[PUT /api/profile]", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});
