import { convert } from "html-to-text";
import Parser from "rss-parser";
import { prisma } from "@/lib/prisma";

const RSS_URL = "https://freelancehunt.com/rss/projects.xml";
const PROGRAMMING_RSS_URLS = [
  "https://freelancehunt.com/project/skill/99.rss",
  "https://freelancehunt.com/project/skill/28.rss",
  "https://freelancehunt.com/project/skill/22.rss",
];
const PLATFORM = "Freelancehub";

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

function extractDescription(item: Parser.Item): string {
  const extended = item as Parser.Item & {
    description?: string;
    contentEncoded?: string;
  };

  const raw =
    extended.content ??
    extended.contentEncoded ??
    extended.contentSnippet ??
    extended.summary ??
    extended.description ??
    "";

  if (!raw.includes("<")) {
    return raw.trim();
  }

  return convert(raw, { wordwrap: false }).trim();
}

function passesPrefilter(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  const hasBlock = BLOCK_KEYWORDS.some((keyword) => text.includes(keyword));
  const hasAllowed = ALLOWED_KEYWORDS.some((keyword) => text.includes(keyword));

  return !hasBlock || hasAllowed;
}

async function fetchFeedItems(): Promise<Parser.Item[]> {
  try {
    const feed = await parser.parseURL(RSS_URL);
    return feed.items;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[freelancehubParser] ${RSS_URL} недоступен (${message}). Используем RSS категории «Программирование».`
    );
  }

  const itemsByLink = new Map<string, Parser.Item>();

  for (const url of PROGRAMMING_RSS_URLS) {
    const feed = await parser.parseURL(url);
    for (const item of feed.items) {
      const link = item.link?.trim();
      if (link && !itemsByLink.has(link)) {
        itemsByLink.set(link, item);
      }
    }
  }

  return [...itemsByLink.values()];
}

export async function parseFreelancehubJobs(): Promise<number> {
  const items = await fetchFeedItems();
  const totalInRss = items.length;
  let itOrders = 0;
  let trashCount = 0;
  let addedCount = 0;

  for (const item of items) {
    const link = item.link?.trim();
    const title = item.title?.trim();

    if (!link || !title) {
      continue;
    }

    const description = extractDescription(item);

    if (!passesPrefilter(title, description)) {
      trashCount++;
      continue;
    }

    itOrders++;

    const existing = await prisma.rawJob.findUnique({
      where: { url: link },
    });

    if (existing) {
      continue;
    }

    await prisma.rawJob.create({
      data: {
        title,
        description,
        platform: PLATFORM,
        url: link,
        status: "pending",
      },
    });

    addedCount++;
  }

  console.log(
    `[freelancehubParser] Найдено в RSS: ${totalInRss}. Отфильтровано IT-заказов: ${itOrders}. Скинуто мусора: ${trashCount}.`
  );
  return addedCount;
}
