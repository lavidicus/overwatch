"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import type { NavItem, SectionKey } from "@/lib/content";

type Props = {
  nav: Record<SectionKey, NavItem[]>;
  children: React.ReactNode;
};

export default function LayoutShell({ nav, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--notion-bg)] text-[var(--notion-text)]">
      <div className="flex min-h-screen">
        <Sidebar
          nav={nav}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--notion-border)] bg-[var(--notion-bg)] px-4 py-3 md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md px-2 py-1 text-lg text-[var(--notion-text)] hover:bg-[var(--notion-hover)]"
              aria-label="Open sidebar"
            >
              ☰
            </button>
            <div className="text-sm font-semibold">Workspace Wiki</div>
            <ThemeToggle compact />
          </header>
          <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
