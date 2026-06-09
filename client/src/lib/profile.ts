import { prisma } from "./prisma";
import {
  DEFAULT_BIO,
  DEFAULT_STOP_WORDS,
  DEFAULT_TECH_STACK,
} from "./profileDefaults";

export async function ensureProfile(userId: string, email: string) {
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
