"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ExternalLink,
  AlertTriangle,
  Copy,
  Check,
  Cpu,
  Archive,
  Send,
  Loader2,
  ArrowLeft,
  DollarSign,
  CalendarDays,
} from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { fetchJobs, updateJobStatus } from "@/lib/api";
import { PROFILE_UPDATED_EVENT } from "@/lib/profileEvents";
import type { AnalyzedJob, JobStatus } from "@/types";

function MatchBadge({ percentage }: { percentage: number }) {
  const colorClass =
    percentage >= 80
      ? "bg-accent/20 text-accent-bright border-accent/30 neon-glow"
      : percentage >= 50
        ? "bg-accent/10 text-accent border-accent/20"
        : "bg-white/5 text-foreground-muted border-glass-border";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-lg border px-2.5 py-1 text-sm font-bold ${colorClass}`}
    >
      {percentage}%
    </span>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  if (status === "applied") {
    return (
      <span className="rounded-md bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-bright">
        Откликнулся
      </span>
    );
  }
  return null;
}

function JobCard({
  job,
  isSelected,
  onSelect,
}: {
  job: AnalyzedJob;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl p-3.5 text-left transition-all duration-200 md:p-4 ${
        isSelected
          ? "glass-panel-strong border-accent/40 neon-glow"
          : "glass-panel hover:border-glass-highlight active:scale-[0.99]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
          {job.title}
        </h3>
        <MatchBadge percentage={job.match_percentage} />
      </div>
      <p className="mt-2 text-xs text-foreground-muted line-clamp-2">
        {job.ai_summary}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={job.status} />
        {job.tech_stack.slice(0, 3).map((tech) => (
          <span
            key={tech}
            className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-foreground-muted"
          >
            {tech}
          </span>
        ))}
        {job.tech_stack.length > 3 && (
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-foreground-muted">
            +{job.tech_stack.length - 3}
          </span>
        )}
      </div>
      <p className="mt-2 text-[11px] text-foreground-muted/70">
        {job.platform}
        {job.budget && ` · ${job.budget}`}
      </p>
    </button>
  );
}

function EstimateCards({
  priceUsd,
  days,
}: {
  priceUsd: number | null;
  days: number | null;
}) {
  if (priceUsd == null && days == null) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {priceUsd != null && (
        <div className="glass-panel rounded-xl border border-accent/25 bg-accent/[0.06] p-3.5 shadow-[0_0_24px_-6px_rgba(20,244,200,0.35)] backdrop-blur-md md:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 neon-glow">
              <DollarSign className="h-4 w-4 text-accent-bright" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
                Рекомендуемый бюджет
              </p>
              <p className="mt-0.5 text-base font-bold text-accent-bright neon-text md:text-lg">
                ${priceUsd.toLocaleString("en-US")}
              </p>
            </div>
          </div>
        </div>
      )}
      {days != null && (
        <div className="glass-panel rounded-xl border border-accent/25 bg-accent/[0.06] p-3.5 shadow-[0_0_24px_-6px_rgba(20,244,200,0.35)] backdrop-blur-md md:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 neon-glow">
              <CalendarDays className="h-4 w-4 text-accent-bright" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
                Срок выполнения
              </p>
              <p className="mt-0.5 text-base font-bold text-accent-bright neon-text md:text-lg">
                {days} {days === 1 ? "день" : days >= 2 && days <= 4 ? "дня" : "дней"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function resolveApplyHref(job: AnalyzedJob): string | null {
  const raw = job.direct_apply_link || job.apply_url;
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("mailto:")) {
    return trimmed;
  }

  if (trimmed.includes("@")) {
    return `mailto:${trimmed.replace(/^mailto:/, "")}`;
  }

  return trimmed;
}

function DirectApplyButton({ job }: { job: AnalyzedJob }) {
  const href = resolveApplyHref(job);

  if (!href) {
    return null;
  }

  const isEmail = href.startsWith("mailto:");

  return (
    <a
      href={href}
      target={isEmail ? undefined : "_blank"}
      rel={isEmail ? undefined : "noopener noreferrer"}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-[0_0_24px_-4px_rgba(16,185,129,0.65)] transition-all hover:bg-emerald-400 hover:shadow-[0_0_32px_-4px_rgba(16,185,129,0.8)] active:scale-[0.98] sm:w-auto sm:px-5"
    >
      🚀 Подать заявку НАПРЯМУЮ работодателю
      {!isEmail && <ExternalLink className="h-4 w-4" />}
    </a>
  );
}

function CoverLetterBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCoverLetter() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback for older mobile browsers */
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <GlassPanel className="flex-1 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Cover Letter
        </h3>
        <button
          type="button"
          onClick={copyCoverLetter}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-bright transition-all hover:bg-accent/20 active:scale-95"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Скопировано
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Копировать
            </>
          )}
        </button>
      </div>
      <button
        type="button"
        onClick={copyCoverLetter}
        className={`mt-4 w-full rounded-xl border p-4 text-left transition-all active:scale-[0.99] md:p-5 ${
          copied
            ? "border-accent/40 bg-accent/10"
            : "border-glass-border bg-white/[0.02] hover:border-accent/20"
        }`}
        aria-label="Нажмите, чтобы скопировать сопроводительное письмо"
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {text}
        </p>
        <p className="mt-3 text-[11px] text-foreground-muted md:hidden">
          {copied ? "Текст скопирован в буфер" : "Нажмите, чтобы скопировать"}
        </p>
      </button>
    </GlassPanel>
  );
}

function JobDetail({
  job,
  onStatusChange,
  isUpdating,
  onBack,
  showBackButton,
}: {
  job: AnalyzedJob;
  onStatusChange: (status: "applied" | "archived") => Promise<void>;
  isUpdating: boolean;
  onBack?: () => void;
  showBackButton?: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto md:gap-4">
      {showBackButton && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-glass-border bg-white/5 px-3 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-white/10 active:scale-[0.98] lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к списку
        </button>
      )}

      <GlassPanel strong className="p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-snug text-foreground md:text-xl">
              {job.title}
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              {job.platform}
              {job.budget && ` · ${job.budget}`}
            </p>
          </div>
          <MatchBadge percentage={job.match_percentage} />
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <DirectApplyButton job={job} />
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
            >
              Открыть на {job.platform}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <div className="flex gap-2 sm:ml-auto">
            <button
              type="button"
              disabled={isUpdating || job.status === "applied"}
              onClick={() => onStatusChange("applied")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-medium text-accent-bright transition-all hover:bg-accent/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:py-1.5"
            >
              {isUpdating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Откликнулся
            </button>
            <button
              type="button"
              disabled={isUpdating || job.status === "archived"}
              onClick={() => onStatusChange("archived")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-xs font-medium text-foreground-muted transition-all hover:bg-white/10 hover:text-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:py-1.5"
            >
              <Archive className="h-3.5 w-3.5" />
              Архив
            </button>
          </div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-4 md:p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent">
          <Cpu className="h-4 w-4" />
          AI-разбор
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-foreground">
          {job.ai_summary}
        </p>

        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
            Tech Stack
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {job.tech_stack.map((tech) => (
              <span
                key={tech}
                className="rounded-lg border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-bright"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {job.red_flags.length > 0 && (
          <div className="mt-5">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-danger">
              <AlertTriangle className="h-3.5 w-3.5" />
              Red Flags
            </p>
            <ul className="mt-2 space-y-1.5">
              {job.red_flags.map((flag) => (
                <li
                  key={flag}
                  className="flex items-start gap-2 text-sm text-danger/90"
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-danger" />
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}
      </GlassPanel>

      <EstimateCards
        priceUsd={job.estimated_price_usd}
        days={job.estimated_days}
      />

      <CoverLetterBlock text={job.cover_letter_expert} />
    </div>
  );
}

export function JobsView() {
  const pathname = usePathname();
  const [jobs, setJobs] = useState<AnalyzedJob[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchJobs();
      const visible = data.filter((j) => j.status !== "archived");
      setJobs(visible);
      setSelectedId((prev) => {
        if (prev && visible.some((j) => j.id === prev)) return prev;
        return visible[0]?.id ?? "";
      });
      setMobileDetailOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить лиды");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pathname !== "/jobs") {
      return;
    }

    function handleProfileUpdated() {
      setLoading(true);
      void loadJobs();
    }

    setLoading(true);
    void loadJobs();

    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    };
  }, [pathname, loadJobs]);

  useEffect(() => {
    if (!mobileDetailOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileDetailOpen]);

  const selectedJob = jobs.find((j) => j.id === selectedId);

  function handleSelectJob(id: string) {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setMobileDetailOpen(true);
    }
  }

  function handleBackToList() {
    setMobileDetailOpen(false);
  }

  async function handleStatusChange(status: "applied" | "archived") {
    if (!selectedJob) return;

    setIsUpdating(true);
    try {
      await updateJobStatus(selectedJob.id, status);
      if (status === "archived") {
        const remaining = jobs.filter((j) => j.id !== selectedJob.id);
        setJobs(remaining);
        setSelectedId(remaining[0]?.id ?? "");
        setMobileDetailOpen(false);
      } else {
        setJobs((prev) =>
          prev.map((j) => (j.id === selectedJob.id ? { ...j, status } : j))
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось обновить статус"
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem-4.5rem-env(safe-area-inset-bottom,0px))] flex-col page-padding md:h-[calc(100dvh-0px)]">
      <header className="mb-4 shrink-0 md:mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Лиды
        </h1>
        <p className="mt-1 text-sm text-foreground-muted md:text-base">
          Проанализированные заказы с AI-оценкой и готовым Cover Letter
        </p>
      </header>

      {loading && (
        <div className="flex flex-1 items-center justify-center gap-2 text-foreground-muted">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          Загрузка лидов...
        </div>
      )}

      {error && !loading && (
        <GlassPanel className="mb-4 border-danger/30 p-4 text-sm text-danger">
          {error}
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadJobs();
            }}
            className="ml-3 underline hover:no-underline"
          >
            Повторить
          </button>
        </GlassPanel>
      )}

      {!loading && jobs.length === 0 && !error && (
        <GlassPanel className="flex flex-1 items-center justify-center p-6 text-center text-sm text-foreground-muted md:p-8">
          Пока нет проанализированных лидов. AI Worker обработает pending-заказы
          автоматически.
        </GlassPanel>
      )}

      {!loading && jobs.length > 0 && (
        <>
          {/* Job list — hidden on mobile when detail is open */}
          <div
            className={`grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,380px)_1fr] lg:gap-6 ${
              mobileDetailOpen ? "hidden lg:grid" : "grid"
            }`}
          >
            <div className="flex flex-col gap-2.5 overflow-y-auto pr-0.5 md:gap-3 lg:pr-1">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSelected={job.id === selectedId}
                  onSelect={() => handleSelectJob(job.id)}
                />
              ))}
            </div>

            {/* Desktop detail pane */}
            <div className="hidden min-h-0 overflow-hidden lg:block">
              {selectedJob && (
                <JobDetail
                  job={selectedJob}
                  onStatusChange={handleStatusChange}
                  isUpdating={isUpdating}
                />
              )}
            </div>
          </div>

          {/* Mobile fullscreen detail overlay */}
          {mobileDetailOpen && selectedJob && (
            <div className="fixed inset-x-0 top-14 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 flex flex-col bg-background/95 backdrop-blur-sm mobile-slide-in lg:hidden">
              <div className="flex-1 overflow-y-auto page-padding pt-3">
                <JobDetail
                  job={selectedJob}
                  onStatusChange={handleStatusChange}
                  isUpdating={isUpdating}
                  onBack={handleBackToList}
                  showBackButton
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
