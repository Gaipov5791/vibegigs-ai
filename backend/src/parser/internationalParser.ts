import { convert } from "html-to-text";
import Parser from "rss-parser";
import { prisma } from "../lib/prisma";

const WWR_PLATFORM = "We Work Remotely";

const WWR_FEEDS = [
  "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
];

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

function cleanExtractedUrl(url: string): string {
  return url.replace(/[.,;:!?)>\]"']+$/, "").trim();
}

function isWwrUrl(url: string): boolean {
  return /weworkremotely\.com/i.test(url);
}

function extractDirectApplyLink(text: string): string | null {
  if (!text) {
    return null;
  }

  const hrefValues = [...text.matchAll(/href=["']([^"']+)["']/gi)].map(
    (match) => match[1]
  );
  const searchText = [text, ...hrefValues].join("\n");

  const urlPatterns = [
    /https?:\/\/[^\s<>"')\]]*greenhouse\.io[^\s<>"')\]]*/gi,
    /https?:\/\/[^\s<>"')\]]*lever\.co[^\s<>"')\]]*/gi,
    /https?:\/\/[^\s<>"')\]]*apply[^\s<>"')\]]*/gi,
  ];

  for (const pattern of urlPatterns) {
    const matches = searchText.match(pattern) ?? [];
    for (const match of matches) {
      const cleaned = cleanExtractedUrl(match);
      if (cleaned && !isWwrUrl(cleaned)) {
        return cleaned;
      }
    }
  }

  const emailMatch = searchText.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  );
  if (emailMatch) {
    return emailMatch[0];
  }

  return null;
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
    console.warn(`[internationalParser] Feed unavailable ${url}: ${message}`);
    return [];
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function parseInternationalJobs(): Promise<{
  feedsScanned: number;
  addedCount: number;
}> {
  let addedCount = 0;
  let feedsScanned = 0;
  const seenUrls = new Set<string>();

  for (const [index, feedUrl] of WWR_FEEDS.entries()) {
    if (index > 0) {
      await delay(1500);
    }

    const items = await fetchFeedItems(feedUrl);
    feedsScanned++;

    for (const item of items) {
      const url = extractListingUrl(item);
      if (!url || seenUrls.has(url)) {
        continue;
      }

      const rawContent = extractRawContent(item);
      const description = cleanDescription(rawContent);
      const title = item.title?.trim() ?? "Remote Job";
      const applyUrl =
        extractDirectApplyLink(rawContent) ??
        extractDirectApplyLink(description);

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
          platform: WWR_PLATFORM,
          url,
          applyUrl,
          status: "pending",
        },
      });

      addedCount++;
    }
  }

  console.log(
    `[internationalParser] Scanned ${feedsScanned} WWR feeds. Added ${addedCount} new remote jobs.`
  );

  return { feedsScanned, addedCount };
}
