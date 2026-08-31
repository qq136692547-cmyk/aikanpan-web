"use client";

import { Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { BarChart3, Crown, Search, UserRound } from "lucide-react";
import { MarketSwitcher } from "@/components/layout/market-switcher";

const navItems = [
  { href: "/", label: "首页", icon: "I01_dashboard.png" },
  { href: "/market/", label: "市场", icon: "I02_market.png" },
  { href: "/review/", label: "复盘", icon: "I03_review.png" },
  { href: "/research/", label: "研究", icon: "I07_research.png" },
  { href: "/search", label: "搜索", icon: "I04_search.png" },
  { href: "/alerts", label: "盯盘", icon: "I05_alerts.png" },
  { href: "/about/", label: "关于", icon: "I06_about.png" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  // Neomorphism navbar for sub-pages
  return (
    <header className="neo-navbar sticky top-0 z-50">
      <nav className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="neo-card-sm flex h-7 w-7 items-center justify-center" style={{ borderRadius: 8 }}>
            <BarChart3 size={15} style={{ color: "var(--neo-primary)" }} />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-neo-ink">爱看盘</span>
        </Link>

        {/* Desktop nav — neo chips */}
        <div className="hidden items-center gap-1.5 md:flex">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? "neo-chip-active"
                    : "neo-chip"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right side: market switcher + search + user badge */}
        <div className="hidden items-center gap-2 md:flex">
          <Suspense fallback={null}><MarketSwitcher /></Suspense>
          <Link href="/upgrade" className="neo-chip flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-neo-ink-mid">
            <Crown size={13} />
            会员
          </Link>
          <form action="/search" className="flex items-center">
            <input
              type="text"
              name="q"
              placeholder="股票代码…"
              className="neo-input w-32 px-3.5 py-1.5 text-[12px]"
            />
          </form>
          {/* User badge */}
          <Link
            href="/account"
            className="neo-chip flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-neo-ink-mid"
            title={user?.user_id ?? "登录"}
          >
            <UserRound size={13} />
            {user?.type === "phone" ? "已登录" : "登录"}
          </Link>
        </div>

        {/* Mobile search + toggle */}
        <div className="flex items-center md:hidden">
          <button
            className="neo-card-sm mr-1 flex items-center justify-center p-2"
            style={{ borderRadius: 10 }}
            onClick={() => window.dispatchEvent(new CustomEvent("open-global-search"))}
            aria-label="搜索"
          >
            <Search size={16} style={{ color: "var(--neo-ink)" }} />
          </button>
          <button
            className="neo-card-sm flex items-center justify-center p-2"
            style={{ borderRadius: 10 }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="菜单"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neo-ink)" strokeWidth="2">
              {mobileOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="neo-page px-6 py-3 md:hidden">
          <div className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-[13px] ${
                    active ? "neo-chip-active" : "neo-chip"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/upgrade"
              className={`rounded-full px-4 py-2 text-[13px] ${
                pathname === "/upgrade" ? "neo-chip-active" : "neo-chip"
              }`}
              onClick={() => setMobileOpen(false)}
            >
              会员
            </Link>
            <Link
              href="/account"
              className={`rounded-full px-4 py-2 text-[13px] ${
                pathname === "/account" ? "neo-chip-active" : "neo-chip"
              }`}
              onClick={() => setMobileOpen(false)}
            >
              账户
            </Link>
          </div>
          <div className="mb-3">
            <Suspense fallback={null}><MarketSwitcher /></Suspense>
          </div>
          <form action="/search" className="mt-3 mb-1">
            <input
              type="text"
              name="q"
              placeholder="股票代码…"
              className="neo-input w-full px-3.5 py-2 text-[12px]"
            />
          </form>
        </div>
      )}
    </header>
  );
}
