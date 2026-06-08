import {
  DEFAULT_SELECTED_PLATFORM,
  type PlatformOption,
} from "./platforms";

export const DEFAULT_TECH_STACK = [
  "React",
  "Next.js",
  "TypeScript",
  "React Native",
];

export const DEFAULT_STOP_WORDS = ["WordPress", "PHP", "1C", "Bitrix"];

export const DEFAULT_BIO =
  "Senior Fullstack Developer с 5-летним опытом. Стек: React, Next.js, TypeScript, React Native. Специализируюсь на создании автоматизированных систем, ИИ-агентов, умных парсеров данных и интеграции LLM в бизнес-процессы.";

export interface ProfileData {
  id: string;
  email: string;
  tech_stack: string[];
  stop_words: string[];
  bio: string;
  selected_platform: PlatformOption;
}

export function parseProfileRecord(profile: {
  id: string;
  email: string;
  tech_stack: unknown;
  stop_words: unknown;
  bio: string;
  selected_platform?: string;
}): ProfileData {
  return {
    id: profile.id,
    email: profile.email,
    tech_stack: Array.isArray(profile.tech_stack)
      ? (profile.tech_stack as string[])
      : DEFAULT_TECH_STACK,
    stop_words: Array.isArray(profile.stop_words)
      ? (profile.stop_words as string[])
      : DEFAULT_STOP_WORDS,
    bio: profile.bio || DEFAULT_BIO,
    selected_platform:
      profile.selected_platform === "Contra" ||
      profile.selected_platform === "Freelancehub" ||
      profile.selected_platform === "We Work Remotely"
        ? profile.selected_platform
        : DEFAULT_SELECTED_PLATFORM,
  };
}
