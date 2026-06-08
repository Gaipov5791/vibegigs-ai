import type { ReactNode } from "react";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  /** Apply default responsive padding (p-4 on mobile, p-6 on md+) */
  padded?: boolean;
}

export function GlassPanel({
  children,
  className = "",
  strong,
  padded = false,
}: GlassPanelProps) {
  const paddingClass = padded ? "p-4 md:p-6" : "";

  return (
    <div
      className={`rounded-xl md:rounded-2xl ${strong ? "glass-panel-strong" : "glass-panel"} ${paddingClass} ${className}`}
    >
      {children}
    </div>
  );
}
