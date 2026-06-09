import { convert } from "html-to-text";
import Parser from "rss-parser";
import { prisma } from "@/lib/prisma";

const CONTRA_PLATFORM = "Contra";

const CONTRA_FEEDS = ["https://rsshub.app/contra/jobs"];

const ALLOWED_KEYWORDS = [
  "react",
  "next",
  "next.js",
  "typescript",
  "javascript",
  "full stack",
  "fullstack",
  "full-stack",
  "frontend",
  "front-end",
  "backend",
  "back-end",
  "mobile",
  "react native",
  "node",
  "api",
  "automation",
  "ai",
  "llm",
  "agent",
  "parser",
  "developer",
  "engineer",
  "software",
  "remote",
];

const BLOCK_KEYWORDS = [
  "wordpress",
  "php",
  "designer",
  "graphic design",
  "copywriter",
  "seo specialist",
  "video editor",
  "customer support",
  "sales representative",
  "account manager",
];

const parser = new Parser({
  requestOptions: {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    timeout: 15_000,
  },
});

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

function cleanDescription(raw: string): string {
  const withoutHtml = raw.includes("<")
    ? convert(raw, { wordwrap: false })
    : raw;

  return withoutHtml.replace(/\s+/g, " ").trim();
}

function extractListingUrl(item: Parser.Item): string | null {
  const link = item.link?.trim();
  if (link && /^https?:\/\//i.test(link)) {
    return link;
  }

  const guid = typeof item.guid === "string" ? item.guid.trim() : undefined;
  if (guid && /^https?:\/\//i.test(guid)) {
    return guid;
  }

  return link ?? guid ?? null;
}

function passesPrefilter(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  const hasBlock = BLOCK_KEYWORDS.some((keyword) => text.includes(keyword));
  const hasAllowed = ALLOWED_KEYWORDS.some((keyword) => text.includes(keyword));

  return !hasBlock && hasAllowed;
}

async function fetchFeedItems(url: string): Promise<Parser.Item[]> {
  try {
    const feed = await parser.parseURL(url);
    return feed.items ?? [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[contraParser] Feed unavailable ${url}: ${message}`);
    return [];
  }
}

export async function parseContraJobs(): Promise<{
  feedsScanned: number;
  addedCount: number;
}> {
  let addedCount = 0;
  let feedsScanned = 0;
  const seenUrls = new Set<string>();

  for (const feedUrl of CONTRA_FEEDS) {
    const items = await fetchFeedItems(feedUrl);
    feedsScanned++;

    if (items.length === 0) {
      console.warn(
        "[contraParser] Contra feed unavailable — Contra has no official public RSS; skipping."
      );
      continue;
    }

    for (const item of items) {
      const url = extractListingUrl(item);
      if (!url || seenUrls.has(url)) {
        continue;
      }

      const rawContent = extractRawContent(item);
      const description = cleanDescription(rawContent);
      const title = item.title?.trim() ?? "Remote Job";

      if (!description || !passesPrefilter(title, description)) {
        continue;
      }

      seenUrls.add(url);

      const existing = await prisma.rawJob.findUnique({ where: { url } });
      if (existing) {
        continue;
      }

      await prisma.rawJob.create({
        data: {
          title,
          description,
          platform: CONTRA_PLATFORM,
          url,
          status: "pending",
        },
      });

      addedCount++;
    }
  }

  console.log(
    `[contraParser] Scanned ${feedsScanned} feeds. Added ${addedCount} new Contra jobs.`
  );

  return { feedsScanned, addedCount };
}
