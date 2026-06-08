"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Target,
  Sparkles,
  Clock,
  Send,
  Loader2,
} from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { fetchJobs, fetchStats } from "@/lib/api";
import type { AnalyzedJob, DashboardStats } from "@/types";

function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ElementType;
}) {
  return (
    <GlassPanel className="group p-4 transition-all duration-300 hover:border-accent/30 md:p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent/20 md:h-11 md:w-11">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <p className="mt-3 text-xs text-foreground-muted md:mt-4 md:text-sm">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {value}
        {suffix && (
          <span className="ml-1 text-base font-normal text-accent neon-text md:text-lg">
            {suffix}
          </span>
        )}
      </p>
    </GlassPanel>
  );
}

function MatchBar({
  day,
  count,
  avgMatch,
  maxCount,
}: {
  day: string;
  count: number;
  avgMatch: number;
  maxCount: number;
}) {
  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 md:gap-2">
      <div className="relative flex h-24 w-full items-end justify-center md:h-32">
        <div
          className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-accent/20 to-accent transition-all duration-500 neon-glow md:max-w-[40px]"
          style={{ height: `${Math.max(height, count > 0 ? 8 : 0)}%` }}
        />
        {count > 0 && (
          <span className="absolute -top-5 text-[10px] font-medium text-accent-bright md:-top-6 md:text-xs">
            {avgMatch}%
          </span>
        )}
      </div>
      <span className="w-full truncate text-center text-[10px] text-foreground-muted md:text-xs">
        {day}
      </span>
      <span className="text-[9px] text-foreground-muted/60 md:text-[10px]">
        {count} лидов
      </span>
    </div>
  );
}

export function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topJobs, setTopJobs] = useState<AnalyzedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, jobsData] = await Promise.all([
          fetchStats(),
          fetchJobs(),
        ]);
        setStats(statsData);
        setTopJobs(
          jobsData
            .filter((j) => j.status !== "archived")
            .sort((a, b) => b.match_percentage - a.match_percentage)
            .slice(0, 3)
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Не удалось загрузить данные"
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const maxCount = stats
    ? Math.max(...stats.weeklyMatches.map((d) => d.count), 1)
    : 1;

  return (
    <div className="page-padding">
      <header className="mb-5 md:mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Дашборд
        </h1>
        <p className="mt-1 text-sm text-foreground-muted md:text-base">
          Обзор аналитики ИИ по вашим лидам
        </p>
      </header>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-foreground-muted md:py-24">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          Загрузка статистики...
        </div>
      )}

      {error && !loading && (
        <GlassPanel className="border-danger/30 p-4 text-sm text-danger md:p-6">
          {error}
        </GlassPanel>
      )}

      {stats && !loading && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            <StatCard
              label="Проанализировано"
              value={stats.totalAnalyzed}
              icon={Sparkles}
            />
            <StatCard
              label="Средний матч"
              value={stats.averageMatch}
              suffix="%"
              icon={Target}
            />
            <StatCard
              label="Откликнулись"
              value={stats.appliedCount}
              icon={Send}
            />
            <StatCard
              label="В очереди"
              value={stats.pendingCount}
              icon={Clock}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:mt-6 md:gap-6 xl:grid-cols-3">
            <GlassPanel strong className="p-4 md:p-6 xl:col-span-2">
              <h2 className="text-base font-semibold text-foreground md:text-lg">
                Средний матч за неделю
              </h2>
              <p className="mt-1 text-xs text-foreground-muted md:text-sm">
                Процент совпадения и количество лидов по дням
              </p>
              <div className="mt-5 flex min-w-0 items-end gap-1 overflow-x-auto pb-1 md:mt-8 md:gap-2">
                {stats.weeklyMatches.map((day, i) => (
                  <MatchBar key={i} {...day} maxCount={maxCount} />
                ))}
              </div>
            </GlassPanel>

            <GlassPanel className="p-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground md:text-lg">
                  Топ-лиды
                </h2>
                {stats.highMatchCount > 0 && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-accent">
                    <TrendingUp className="h-3 w-3" />
                    {stats.highMatchCount} &gt;80%
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-foreground-muted md:text-sm">
                Лучшие совпадения
              </p>
              {topJobs.length === 0 ? (
                <p className="mt-4 text-sm text-foreground-muted md:mt-6">
                  Нет данных — дождитесь анализа первых лидов
                </p>
              ) : (
                <ul className="mt-3 space-y-2.5 md:mt-4 md:space-y-3">
                  {topJobs.map((job) => (
                    <li
                      key={job.id}
                      className="glass-panel rounded-xl p-3 transition-colors hover:border-accent/20"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">
                          {job.title}
                        </p>
                        <span
                          className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold ${
                            job.match_percentage >= 80
                              ? "bg-accent/20 text-accent-bright neon-glow"
                              : job.match_percentage >= 50
                                ? "bg-accent/10 text-accent"
                                : "bg-white/5 text-foreground-muted"
                          }`}
                        >
                          {job.match_percentage}%
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-foreground-muted">
                        {job.platform}
                        {job.budget && ` · ${job.budget}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </GlassPanel>
          </div>
        </>
      )}
    </div>
  );
}
