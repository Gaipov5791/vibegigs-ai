const ALLOWED_STATUSES = ["processed", "applied", "archived"] as const;
export type AllowedJobStatus = (typeof ALLOWED_STATUSES)[number];

export { ALLOWED_STATUSES };

export function serializeJob(
  analyzed: {
    id: string;
    rawJobId: string;
    match_percentage: number;
    estimatedPriceUsd: number | null;
    estimatedDays: number | null;
    ai_summary: string;
    red_flags: unknown;
    tech_stack: unknown;
    cover_letter_expert: string;
    direct_apply_link: string | null;
    createdAt: Date;
    rawJob: {
      title: string;
      description: string;
      platform: string;
      budget: string | null;
      url: string;
      applyUrl: string | null;
      status: string;
    };
  }
) {
  return {
    id: analyzed.id,
    rawJobId: analyzed.rawJobId,
    title: analyzed.rawJob.title,
    description: analyzed.rawJob.description,
    platform: analyzed.rawJob.platform,
    budget: analyzed.rawJob.budget,
    url: analyzed.rawJob.url,
    apply_url: analyzed.rawJob.applyUrl,
    direct_apply_link: analyzed.direct_apply_link,
    status: analyzed.rawJob.status,
    match_percentage: analyzed.match_percentage,
    estimated_price_usd: analyzed.estimatedPriceUsd,
    estimated_days: analyzed.estimatedDays,
    ai_summary: analyzed.ai_summary,
    red_flags: analyzed.red_flags as string[],
    tech_stack: analyzed.tech_stack as string[],
    cover_letter_expert: analyzed.cover_letter_expert,
    createdAt: analyzed.createdAt.toISOString(),
  };
}
