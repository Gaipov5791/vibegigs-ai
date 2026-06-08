import { prisma } from "./prisma";
import {
  DEFAULT_SELECTED_PLATFORM,
  isPlatformOption,
  type PlatformOption,
} from "./platforms";

export async function getUserSelectedPlatform(
  userId: string
): Promise<PlatformOption> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { selected_platform: true },
  });

  if (profile && isPlatformOption(profile.selected_platform)) {
    return profile.selected_platform;
  }

  return DEFAULT_SELECTED_PLATFORM;
}
