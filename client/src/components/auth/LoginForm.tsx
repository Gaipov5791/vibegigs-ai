"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Mail, Lock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/GlassPanel";

type Mode = "login" | "signup";

export function LoginForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        if (data.user && !data.session) {
          setError("Проверьте email — мы отправили ссылку для подтверждения регистрации.");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center page-padding">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 neon-glow">
            <Zap className="h-7 w-7 text-accent-bright" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            VibeGigs
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            AI Lead Matcher — международные платформы
          </p>
        </div>

        <GlassPanel className="p-6 md:p-8">
          <div className="mb-6 flex rounded-xl border border-glass-border bg-white/[0.02] p-1">
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  mode === m
                    ? "bg-accent/15 text-accent-bright"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {m === "login" ? "Вход" : "Регистрация"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground-muted">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-glass-border bg-white/5 px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground-muted">
                <Lock className="h-4 w-4" />
                Пароль
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-glass-border bg-white/5 px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/15 py-3 text-sm font-semibold text-accent-bright transition-all hover:bg-accent/25 disabled:opacity-50 neon-glow"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>
        </GlassPanel>
      </div>
    </div>
  );
}
