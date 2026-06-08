"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname.startsWith("/login");

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <main className="min-h-screen pt-14 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pt-0 md:pb-0 md:pl-64">
        {children}
      </main>
    </>
  );
}
