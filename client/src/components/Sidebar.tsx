"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Settings,
  Sparkles,
  Zap,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const navItems = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/jobs", label: "Лиды", icon: Briefcase },
  { href: "/settings", label: "Профиль", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  compact,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Link
        href={href}
        className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-all duration-200 ${
          isActive
            ? "text-accent-bright"
            : "text-foreground-muted hover:text-foreground"
        }`}
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
            isActive ? "bg-accent/15 neon-glow" : "bg-transparent"
          }`}
        >
          <Icon
            className={`h-5 w-5 ${isActive ? "text-accent-bright" : "text-foreground-muted"}`}
          />
        </span>
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-accent/15 text-accent-bright neon-glow"
          : "text-foreground-muted hover:bg-glass-bg hover:text-foreground"
      }`}
    >
      <Icon
        className={`h-5 w-5 transition-colors ${
          isActive
            ? "text-accent-bright"
            : "text-foreground-muted group-hover:text-accent"
        }`}
      />
      {label}
      {isActive && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-bright shadow-[0_0_8px_var(--accent-glow)]" />
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-glass-border bg-background-secondary/80 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-3 border-b border-glass-border px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 neon-glow">
            <Zap className="h-5 w-5 text-accent-bright" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              VibeGigs
            </h1>
            <p className="text-xs text-foreground-muted">AI Lead Matcher</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} isActive={isActive(item.href)} />
          ))}
        </nav>

        <div className="border-t border-glass-border p-4 space-y-3">
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              AI Worker активен
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground-muted">
              We Work Remotely + Contra · каждые 30 сек
            </p>
          </div>
          {user && (
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground-muted transition-colors hover:bg-glass-bg hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="truncate">{user.email}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center gap-3 border-b border-glass-border bg-background-secondary/90 px-4 py-3 backdrop-blur-lg md:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 neon-glow">
          <Zap className="h-4 w-4 text-accent-bright" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-foreground">
            VibeGigs
          </p>
          <p className="text-[10px] text-foreground-muted">AI Lead Matcher</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] font-medium text-accent">
          <Sparkles className="h-3 w-3" />
          AI активен
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-glass-border bg-background-secondary/90 px-2 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-lg md:hidden">
        <div className="flex items-stretch justify-around py-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              isActive={isActive(item.href)}
              compact
            />
          ))}
        </div>
      </nav>
    </>
  );
}
