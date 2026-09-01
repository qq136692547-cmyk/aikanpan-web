"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { BarChart3, Crown, Search, UserRound } from "lucide-react";
import { MobileNavigation, PrimaryNavigation } from "@/components/layout/primary-navigation";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const { membership } = useMembership();
  const isPro = membership?.plan === "pro";
  const isVerified = user?.type === "phone" || user?.type === "email";

  return (
    <header className="neo-navbar sticky top-0 z-50">
      <nav className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="neo-card-sm flex h-7 w-7 items-center justify-center" style={{ borderRadius: 8 }}>
            <BarChart3 size={15} style={{ color: "var(--neo-primary)" }} />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-neo-ink">爱看盘</span>
        </Link>

        <Suspense fallback={<div className="hidden h-7 w-[520px] neo-skeleton rounded-full lg:block" />}>
          <PrimaryNavigation />
        </Suspense>

        <div className="flex items-center gap-2">
          <Link
            href="/upgrade"
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isPro ? "neo-chip-active" : "neo-chip text-neo-ink-mid"
            }`}
            title={isPro ? "Pro 会员" : "升级 Pro"}
          >
            <Crown size={13} />
            <span className="hidden sm:inline">{isPro ? "Pro" : "会员"}</span>
          </Link>

          <Link
            href="/account"
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              pathname === "/account" ? "neo-chip-active" : "neo-chip text-neo-ink-mid"
            }`}
            title={isVerified ? "我的账户" : "登录 / 注册"}
          >
            <UserRound size={13} />
            <span className="hidden md:inline">{isVerified ? "我的账户" : "登录 / 注册"}</span>
          </Link>

          <button
            className="neo-card-sm hidden items-center justify-center p-2 md:flex"
            style={{ borderRadius: 10 }}
            onClick={() => window.dispatchEvent(new CustomEvent("open-global-search"))}
            aria-label="全局搜索"
          >
            <Search size={15} style={{ color: "var(--neo-ink)" }} />
          </button>

          <button
            className="neo-card-sm flex items-center justify-center p-2 lg:hidden"
            style={{ borderRadius: 10 }}
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="菜单"
            aria-expanded={mobileOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neo-ink)" strokeWidth="2">
              {mobileOpen ? <path d="M6 18L18 6M6 6l12 12M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="neo-page border-t border-[var(--neo-surface-inset)] px-4 py-3 lg:hidden">
          <Suspense fallback={<div className="h-24 neo-skeleton rounded-xl" />}>
            <MobileNavigation onNavigate={() => setMobileOpen(false)} />
          </Suspense>
        </div>
      )}
    </header>
  );
}
