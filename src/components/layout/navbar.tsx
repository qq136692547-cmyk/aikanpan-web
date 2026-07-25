"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "首页", href: "/" },
  { label: "市场总览", href: "/market" },
  { label: "每日复盘", href: "/review" },
  { label: "ETF", href: "/etf", badge: "soon" },
  { label: "基金", href: "/fund", badge: "soon" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-6 px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 transition-fast hover:opacity-80">
          <span className="text-lg font-bold text-gradient-brand">
            爱看盘
          </span>
          <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand">
            AI
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-fast",
                  active
                    ? "bg-brand-soft text-brand font-medium"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                )}
              >
                {item.label}
                {"badge" in item && item.badge === "soon" && (
                  <span className="ml-1 rounded bg-[var(--bg-elevated)] px-1 py-0.5 text-[9px] text-[var(--text-tertiary)]">soon</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <form
          action="/search"
          className="hidden items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 transition-fast focus-within:border-[var(--brand)] sm:flex"
        >
          <svg className="h-3.5 w-3.5 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
          </svg>
          <input
            type="text"
            name="q"
            placeholder="搜索股票代码/名称"
            className="w-44 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
          />
          <kbd className="hidden rounded border border-[var(--border-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] lg:inline">
            /
          </kbd>
        </form>
      </div>
    </header>
  );
}
