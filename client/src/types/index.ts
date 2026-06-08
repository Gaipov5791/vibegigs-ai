export type JobStatus =
  | "pending"
  | "processed"
  | "applied"
  | "archived"
  | "failed";

export interface AnalyzedJob {
  id: string;
  rawJobId: string;
  title: string;
  platform: string;
  budget: string | null;
  url: string;
  apply_url: string | null;
  direct_apply_link: string | null;
  status: JobStatus;
  match_percentage: number;
  estimated_price_usd: number | null;
  estimated_days: number | null;
  ai_summary: string;
  red_flags: string[];
  tech_stack: string[];
  cover_letter_expert: string;
  createdAt: string;
}

export interface DashboardStats {
  totalAnalyzed: number;
  averageMatch: number;
  appliedCount: number;
  highMatchCount: number;
  pendingCount: number;
  averageEstimatedPriceUsd: number | null;
  averageEstimatedDays: number | null;
  weeklyMatches: { day: string; count: number; avgMatch: number }[];
}

export type OrderPlatform = "We Work Remotely" | "Contra" | "Freelancehub";

export const ORDER_PLATFORMS: OrderPlatform[] = [
  "We Work Remotely",
  "Contra",
  "Freelancehub",
];

export interface UserProfile {
  id: string;
  email: string;
  tech_stack: string[];
  stop_words: string[];
  bio: string;
  selected_platform: OrderPlatform;
}
