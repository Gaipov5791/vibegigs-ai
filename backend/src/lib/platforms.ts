export const PLATFORM_OPTIONS = [
  "We Work Remotely",
  "Contra",
  "Freelancehub",
] as const;

export type PlatformOption = (typeof PLATFORM_OPTIONS)[number];

export const DEFAULT_SELECTED_PLATFORM: PlatformOption = "We Work Remotely";

export function isPlatformOption(value: string): value is PlatformOption {
  return PLATFORM_OPTIONS.includes(value as PlatformOption);
}
