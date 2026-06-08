import { prisma } from "../lib/prisma";
import {
  DEFAULT_SELECTED_PLATFORM,
  isPlatformOption,
  type PlatformOption,
} from "../lib/platforms";
import { parseContraJobs } from "./contraParser";
import { parseFreelancehubJobs } from "./freelancehuntParser";
import { parseInternationalJobs } from "./internationalParser";

export const PLATFORM_PARSERS: Record<
  PlatformOption,
  () => Promise<unknown>
> = {
  "We Work Remotely": parseInternationalJobs,
  Contra: parseContraJobs,
  Freelancehub: parseFreelancehubJobs,
};

export async function getActivePlatforms(): Promise<PlatformOption[]> {
  const profiles = await prisma.profile.findMany({
    select: { selected_platform: true },
  });

  if (profiles.length === 0) {
    return [DEFAULT_SELECTED_PLATFORM];
  }

  const platforms = new Set<PlatformOption>();

  for (const profile of profiles) {
    if (isPlatformOption(profile.selected_platform)) {
      platforms.add(profile.selected_platform);
    } else {
      platforms.add(DEFAULT_SELECTED_PLATFORM);
    }
  }

  return [...platforms];
}

export async function runParserForPlatform(
  platform: PlatformOption
): Promise<void> {
  const parser = PLATFORM_PARSERS[platform];

  try {
    console.log(`[parserScheduler] Running parser for: ${platform}`);
    await parser();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[parserScheduler] ${platform} parse error: ${message}`);
    throw error;
  }
}

export async function runPlatformParsers(): Promise<void> {
  try {
    const platforms = await getActivePlatforms();

    for (const platform of platforms) {
      await runParserForPlatform(platform);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[parserScheduler] Failed to resolve active platforms: ${message}`
    );
  }
}
