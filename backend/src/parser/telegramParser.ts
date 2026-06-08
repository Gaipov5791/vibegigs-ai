import { convert } from "html-to-text";
import Parser from "rss-parser";
import { prisma } from "../lib/prisma";

const PLATFORM = "Telegram (КР/КЗ)";
const TITLE_MAX_LENGTH = 50;

const TELEGRAM_CHANNELS = [
  { alias: "devkg_jobs", username: "findwork" },
  { alias: "astanahub_jobs", username: "astana_hub" },
  { alias: "js_jobs_kz", username: "it_jobs_kz", fallbackUsername: "devkz_jobs" },
] as const;

const ALLOWED_KEYWORDS = [
  "разработка",
  "сайт",
  "приложение",
  "скрипт",
  "программист",
  "верстка",
  "фронтенд",
  "бэкенд",
  "web",
  "react",
  "next",
  "next.js",
  "node",
  "native",
  "react native",
  "expo",
  "fullstack",
  "backend",
  "mobile",
  "typescript",
  "javascript",
  "api",
  "бот",
  "telegram",
  "database",
  "база данных",
  "programming",
  "developer",
  "software",
  "app",
  "frontend",
];

const BLOCK_KEYWORDS = [
  "дизайн",
  "логотип",
  "копирайт",
  "текст",
  "статья",
  "перевод",
  "seo",
  "дизайнер",
  "баннер",
  "видеомонтаж",
  "smm",
  "инстаграм",
  "таргет",
  "3d",
  "модель",
];

const parser = new Parser({
  requestOptions: {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
  },
});

function buildRssUrls(username: string): string[] {
  return [
    `https://tg.i-c-a.su/rss/${username}?limit=30`,
    `https://rsshub.app/telegram/channel/${username}`,
  ];
}

function extractRawContent(item: Parser.Item): string {
  const extended = item as Parser.Item & {
    description?: string;
    contentEncoded?: string;
  };

  return (
    extended.content ??
    extended.contentEncoded ??
    extended.contentSnippet ??
    extended.summary ??
    extended.description ??
    item.title ??
    ""
  );
}

function cleanTelegramText(raw: string): string {
  const withoutHtml = raw.includes("<")
    ? convert(raw, { wordwrap: false })
    : raw;

  return withoutHtml
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function buildTitle(description: string, fallbackTitle?: string): string {
  const source = description || fallbackTitle?.trim() || "Telegram-пост";
  const normalized = source.replace(/\s+/g, " ").trim();

  if (normalized.length <= TITLE_MAX_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, TITLE_MAX_LENGTH).trim()}…`;
}

function passesPrefilter(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  const hasBlock = BLOCK_KEYWORDS.some((keyword) => text.includes(keyword));
  const hasAllowed = ALLOWED_KEYWORDS.some((keyword) => text.includes(keyword));

  return !hasBlock || hasAllowed;
}

async function fetchChannelItems(username: string): Promise<Parser.Item[]> {
  for (const url of buildRssUrls(username)) {
    try {
      const feed = await parser.parseURL(url);
      if (feed.items?.length) {
        return feed.items;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[telegramParser] ${url} недоступен (${message}).`);
    }
  }

  return [];
}

async function fetchChannelPosts(
  channel: (typeof TELEGRAM_CHANNELS)[number]
): Promise<Parser.Item[]> {
  const usernames = [
    channel.username,
    ...("fallbackUsername" in channel && channel.fallbackUsername
      ? [channel.fallbackUsername]
      : []),
  ];

  for (const username of usernames) {
    const items = await fetchChannelItems(username);
    if (items.length > 0) {
      return items;
    }
  }

  console.warn(
    `[telegramParser] Канал ${channel.alias} (@${channel.username}) не вернул постов.`
  );
  return [];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function parseTelegramChannels(): Promise<{
  channelsScanned: number;
  addedCount: number;
}> {
  let addedCount = 0;
  const seenUrls = new Set<string>();

  for (const [index, channel] of TELEGRAM_CHANNELS.entries()) {
    if (index > 0) {
      await delay(2000);
    }

    const items = await fetchChannelPosts(channel);

    for (const item of items) {
      const url = item.link?.trim() ?? item.guid?.trim();
      if (!url || seenUrls.has(url)) {
        continue;
      }

      const description = cleanTelegramText(extractRawContent(item));
      if (!description) {
        continue;
      }

      const title = buildTitle(description, item.title?.trim());

      if (!passesPrefilter(title, description)) {
        continue;
      }

      seenUrls.add(url);

      const existing = await prisma.rawJob.findUnique({
        where: { url },
      });

      if (existing) {
        continue;
      }

      await prisma.rawJob.create({
        data: {
          title,
          description,
          platform: PLATFORM,
          url,
          status: "pending",
        },
      });

      addedCount++;
    }
  }

  const channelsScanned = TELEGRAM_CHANNELS.length;

  console.log(
    `[telegramParser] Просканировано ${channelsScanned} каналов. Добавлено ${addedCount} новых целевых IT-заказов в базу.`
  );

  return { channelsScanned, addedCount };
}
