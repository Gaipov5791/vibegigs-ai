import { analyzeJob } from "./analyzer";
import { prisma } from "../lib/prisma";
import { parseProfileRecord } from "../lib/profileDefaults";

const POLL_INTERVAL_MS = 30_000;
const DEFAULT_COOLDOWN_MS = 10 * 60 * 1000;

let profileCursor = 0;
let isProcessing = false;
let apiKeyBlocked = false;

/** userId:jobId → timestamp (ms) until retry is allowed */
const jobCooldownUntil = new Map<string, number>();

function maskApiKey(key: string): string {
  return key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : "***";
}

function cooldownKey(userId: string, jobId: string): string {
  return `${userId}:${jobId}`;
}

function markJobCooldown(userId: string, jobId: string, durationMs: number): void {
  const until = Date.now() + durationMs;
  jobCooldownUntil.set(cooldownKey(userId, jobId), until);
  console.log(
    `[aiWorker] Cooldown ${Math.round(durationMs / 1000)}s для ${jobId} (user ${userId.slice(0, 8)}…)`
  );
}

function getCooledDownJobIdsForUser(userId: string): string[] {
  const now = Date.now();
  const ids: string[] = [];

  for (const [key, until] of jobCooldownUntil) {
    if (until <= now) {
      jobCooldownUntil.delete(key);
      continue;
    }
    const [uid, jobId] = key.split(":");
    if (uid === userId) {
      ids.push(jobId);
    }
  }

  return ids;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isInvalidApiKeyError(message: string): boolean {
  return (
    message.includes("API_KEY_INVALID") ||
    message.includes("API key expired") ||
    message.includes("API key not valid")
  );
}

function isTransientGeminiError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.includes("429") ||
    message.includes("503") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("UNAVAILABLE")
  );
}

function isTransientDbError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.includes("Can't reach database server") ||
    message.includes("Connection terminated") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("Connection pool timeout")
  );
}

function parseRetryDelayMs(message: string): number {
  const retryIn = message.match(/retry in (\d+(?:\.\d+)?)s/i);
  if (retryIn) {
    return Math.ceil(parseFloat(retryIn[1]) * 1000);
  }

  const retryDelay = message.match(/"retryDelay":\s*"(\d+)s"/);
  if (retryDelay) {
    return parseInt(retryDelay[1], 10) * 1000;
  }

  return DEFAULT_COOLDOWN_MS;
}

function describeTransientError(message: string): string {
  if (message.includes("503") || message.includes("UNAVAILABLE")) {
    return "модель перегружена (503)";
  }
  return "лимит Gemini API (429)";
}

async function validateGeminiApiKey(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "[aiWorker] GEMINI_API_KEY не задан в process.env — проверьте backend/.env"
    );
    return;
  }

  const keyLabel = apiKey.startsWith("AIzaSy")
    ? `AIzaSy…${apiKey.slice(-4)}`
    : maskApiKey(apiKey);
  console.log(`[aiWorker] GEMINI_API_KEY загружен (${keyLabel})`);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
      }
    );

    if (response.ok) {
      console.log("[aiWorker] GEMINI_API_KEY: валиден");
      apiKeyBlocked = false;
      return;
    }

    const body = await response.text();

    if (isInvalidApiKeyError(body)) {
      apiKeyBlocked = true;
      console.error(
        "[aiWorker] GEMINI_API_KEY недействителен или истёк — обновите ключ в backend/.env (https://aistudio.google.com/apikey)"
      );
      return;
    }

    if (body.includes("429") || body.includes("RESOURCE_EXHAUSTED")) {
      console.warn(
        "[aiWorker] GEMINI_API_KEY принят, но квота временно исчерпана (429) — воркер продолжит с cooldown"
      );
      apiKeyBlocked = false;
      return;
    }

    console.warn(
      `[aiWorker] Проверка GEMINI_API_KEY: HTTP ${response.status} — воркер запущен, повторим при анализе`
    );
    apiKeyBlocked = false;
  } catch (error) {
    console.warn("[aiWorker] Ошибка проверки GEMINI_API_KEY:", error);
  }
}

async function processNextPendingJob(): Promise<void> {
  if (isProcessing) {
    console.log("[aiWorker] Предыдущий цикл ещё выполняется — пропуск");
    return;
  }

  if (apiKeyBlocked) {
    console.warn(
      "[aiWorker] Анализ приостановлен — недействительный GEMINI_API_KEY"
    );
    return;
  }

  isProcessing = true;

  try {
    const profiles = await prisma.profile.findMany({
      orderBy: { createdAt: "asc" },
    });

    if (profiles.length === 0) {
      console.log("[aiWorker] Нет профилей в базе — анализ невозможен");
      return;
    }

    const pendingTotal = await prisma.rawJob.count({
      where: { status: "pending" },
    });

    const eligibleByProfile = await Promise.all(
      profiles.map(async (profile) => ({
        profile,
        count: await prisma.rawJob.count({
          where: {
            status: "pending",
            analyzedJobs: { none: { userId: profile.id } },
          },
        }),
      }))
    );

    const eligibleTotal = eligibleByProfile.reduce(
      (sum, item) => sum + item.count,
      0
    );

    console.log(
      `[aiWorker] Найдено ${pendingTotal} вакансий в очереди (pending), ${eligibleTotal} ожидают анализа`
    );

    if (eligibleTotal === 0) {
      console.log("[aiWorker] Нет вакансий для анализа — пропуск цикла");
      return;
    }

    let processedInCycle = false;

    for (let offset = 0; offset < profiles.length; offset++) {
      const index = (profileCursor + offset) % profiles.length;
      const { profile: profileRecord, count } = eligibleByProfile[index];

      if (count === 0) {
        continue;
      }

      const profile = parseProfileRecord(profileRecord);
      const cooledDownIds = getCooledDownJobIdsForUser(profile.id);

      const rawJob = await prisma.rawJob.findFirst({
        where: {
          status: "pending",
          analyzedJobs: { none: { userId: profile.id } },
          ...(cooledDownIds.length > 0 && { id: { notIn: cooledDownIds } }),
        },
        orderBy: { createdAt: "asc" },
      });

      if (!rawJob) {
        if (cooledDownIds.length > 0) {
          console.log(
            `[aiWorker] Все доступные вакансии для ${profile.email} в cooldown (${cooledDownIds.length})`
          );
        }
        continue;
      }

      profileCursor = (index + 1) % profiles.length;

      console.log(
        `[aiWorker] Берём вакансию ${rawJob.id} для ${profile.email} — "${rawJob.title}"`
      );

      try {
        const analysis = await analyzeJob(
          rawJob.description,
          rawJob.title,
          profile
        );

        jobCooldownUntil.delete(cooldownKey(profile.id, rawJob.id));

        await prisma.analyzedJob.create({
          data: {
            rawJobId: rawJob.id,
            userId: profile.id,
            match_percentage: analysis.match_percentage,
            estimatedPriceUsd: analysis.estimated_price_usd || null,
            estimatedDays: analysis.estimated_days || null,
            ai_summary: analysis.ai_summary,
            red_flags: analysis.red_flags,
            tech_stack: analysis.tech_stack,
            cover_letter_expert: analysis.cover_letter_expert,
            direct_apply_link:
              analysis.direct_apply_link || rawJob.applyUrl || null,
          },
        });

        const remainingProfiles = await prisma.profile.count({
          where: {
            analyzedJobs: { none: { rawJobId: rawJob.id } },
          },
        });

        if (remainingProfiles === 0) {
          await prisma.rawJob.update({
            where: { id: rawJob.id },
            data: { status: "processed" },
          });
        }

        console.log(
          `[aiWorker] Processed job ${rawJob.id} for ${profile.email} (match: ${analysis.match_percentage}%)`
        );

        processedInCycle = true;
        break;
      } catch (error) {
        const message = getErrorMessage(error);

        if (isInvalidApiKeyError(message)) {
          apiKeyBlocked = true;
          console.error(
            "[aiWorker] GEMINI_API_KEY недействителен или истёк — обновите backend/.env"
          );
          return;
        }

        if (isTransientGeminiError(error)) {
          const cooldownMs = parseRetryDelayMs(message);
          markJobCooldown(profile.id, rawJob.id, cooldownMs);
          console.warn(
            `[aiWorker] ${describeTransientError(message)} — пропускаем ${rawJob.id}, пробуем следующую вакансию`
          );
          continue;
        }

        console.error(
          `[aiWorker] Failed to analyze job ${rawJob.id} for ${profile.email}:`,
          error
        );

        await prisma.rawJob.update({
          where: { id: rawJob.id },
          data: { status: "failed" },
        });

        processedInCycle = true;
        break;
      }
    }

    if (!processedInCycle) {
      console.log(
        "[aiWorker] В этом цикле не удалось обработать вакансии — все кандидаты в cooldown или лимите"
      );
    }
  } catch (error) {
    if (isTransientDbError(error)) {
      console.warn(
        "[aiWorker] База данных временно недоступна — пропуск цикла:",
        getErrorMessage(error)
      );
      return;
    }

    console.error("[aiWorker] Неожиданная ошибка в цикле обработки:", error);
  } finally {
    isProcessing = false;
  }
}

export function startAiWorker(): void {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    console.error(
      "[aiWorker] GEMINI_API_KEY не задан в process.env — анализ невозможен"
    );
  } else {
    const keyLabel = apiKey.startsWith("AIzaSy")
      ? `AIzaSy…${apiKey.slice(-4)}`
      : maskApiKey(apiKey);
    console.log(`[aiWorker] GEMINI_API_KEY: ${keyLabel}`);
  }

  console.log(
    `[aiWorker] Started — polling every ${POLL_INTERVAL_MS / 1000}s for pending jobs`
  );

  void validateGeminiApiKey().then(() => processNextPendingJob());

  setInterval(() => {
    void processNextPendingJob();
  }, POLL_INTERVAL_MS);
}
