"use client";

import { useEffect, useState } from "react";
import { Plus, X, Save, User, Ban, FileText, Loader2, Globe } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { fetchProfile, updateProfile } from "@/lib/api";
import { notifyProfileUpdated } from "@/lib/profileEvents";
import { ORDER_PLATFORMS, type OrderPlatform } from "@/types";

const PLATFORM_LABELS: Record<OrderPlatform, { title: string; hint: string }> = {
  "We Work Remotely": {
    title: "We Work Remotely",
    hint: "Международные remote-вакансии (EN)",
  },
  Contra: {
    title: "Contra",
    hint: "Фриланс-проекты для независимых специалистов",
  },
  Freelancehub: {
    title: "Freelancehub",
    hint: "СНГ-рынок: IT-заказы с Freelancehunt RSS",
  },
};

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  function addTag() {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput("");
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-1.5 md:gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex max-w-full items-center gap-1 rounded-lg border border-accent/20 bg-accent/10 px-2 py-0.5 text-xs text-accent-bright md:px-3 md:py-1 md:text-sm"
          >
            <span className="truncate">{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="shrink-0 rounded p-0.5 transition-colors hover:bg-accent/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex min-w-0 gap-1.5 md:gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 outline-none transition-colors focus:border-accent/40 focus:ring-1 focus:ring-accent/20 md:rounded-xl md:px-4 md:py-2.5"
        />
        <button
          type="button"
          onClick={addTag}
          aria-label="Добавить"
          className="flex shrink-0 items-center justify-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-2 text-xs font-medium text-accent-bright transition-all hover:bg-accent/20 md:gap-1.5 md:rounded-xl md:px-3.5 md:py-2.5 md:text-sm"
        >
          <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="hidden sm:inline">Добавить</span>
        </button>
      </div>
    </div>
  );
}

export function SettingsForm() {
  const [stack, setStack] = useState<string[]>([]);
  const [stopWords, setStopWords] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [selectedPlatform, setSelectedPlatform] =
    useState<OrderPlatform>("We Work Remotely");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile()
      .then((profile) => {
        setStack(profile.tech_stack);
        setStopWords(profile.stop_words);
        setBio(profile.bio);
        setSelectedPlatform(profile.selected_platform);
        setEmail(profile.email);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const profile = await updateProfile({
        tech_stack: stack,
        stop_words: stopWords,
        bio,
        selected_platform: selectedPlatform,
      });
      setStack(profile.tech_stack);
      setStopWords(profile.stop_words);
      setBio(profile.bio);
      setSelectedPlatform(profile.selected_platform);
      notifyProfileUpdated();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center page-padding">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="page-padding">
      <header className="mb-5 md:mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Профиль разработчика
        </h1>
        <p className="mt-1 text-sm text-foreground-muted md:text-base">
          {email
            ? `Аккаунт: ${email} — настройки используются AI-воркером для матчинга и Cover Letter`
            : "Настройте стек, стоп-слова и bio для точного AI-матчинга"}
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mx-auto min-w-0 max-w-2xl space-y-4 md:space-y-6">
        <GlassPanel className="p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 neon-glow">
              <Globe className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Активный источник заказов
              </h2>
              <p className="text-sm text-foreground-muted">
                Парсер подтягивает заказы только с выбранной площадки
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {ORDER_PLATFORMS.map((platform) => {
              const isSelected = selectedPlatform === platform;
              const label = PLATFORM_LABELS[platform];

              return (
                <label
                  key={platform}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-all ${
                    isSelected
                      ? "border-accent/50 bg-accent/10 neon-glow"
                      : "border-glass-border bg-white/5 hover:border-accent/25 hover:bg-white/[0.07]"
                  }`}
                >
                  <input
                    type="radio"
                    name="selected_platform"
                    value={platform}
                    checked={isSelected}
                    onChange={() => setSelectedPlatform(platform)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-semibold md:text-base ${
                        isSelected ? "text-accent-bright neon-text" : "text-foreground"
                      }`}
                    >
                      {label.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-foreground-muted md:text-sm">
                      {label.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </GlassPanel>

        <GlassPanel className="p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <User className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Ваш стек
              </h2>
              <p className="text-sm text-foreground-muted">
                Технологии для расчёта match_percentage
              </p>
            </div>
          </div>
          <div className="mt-5">
            <TagInput
              tags={stack}
              onChange={setStack}
              placeholder="Например: Vue.js"
            />
          </div>
        </GlassPanel>

        <GlassPanel className="p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10">
              <Ban className="h-5 w-5 text-danger" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Стоп-слова
              </h2>
              <p className="text-sm text-foreground-muted">
                Автоматически снижают матч при обнаружении в описании
              </p>
            </div>
          </div>
          <div className="mt-5">
            <TagInput
              tags={stopWords}
              onChange={setStopWords}
              placeholder="Например: Joomla"
            />
          </div>
        </GlassPanel>

        <GlassPanel className="p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                О себе (Bio)
              </h2>
              <p className="text-sm text-foreground-muted">
                Позиционирование для AI — используется в Cover Letter на английском
              </p>
            </div>
          </div>
          <div className="mt-5">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              placeholder="Опишите свой опыт и специализацию..."
              className="w-full resize-y rounded-xl border border-glass-border bg-white/5 px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-foreground-muted/50 outline-none transition-colors focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
            />
          </div>
        </GlassPanel>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/15 py-3.5 text-sm font-semibold text-accent-bright transition-all hover:bg-accent/25 disabled:opacity-50 neon-glow"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "Сохранено!" : saving ? "Сохранение..." : "Сохранить профиль"}
        </button>
      </div>
    </div>
  );
}
