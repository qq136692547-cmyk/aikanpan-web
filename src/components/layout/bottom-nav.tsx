"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bell, ClipboardList, Home, Info, Microscope, Search, TrendingUp } from "lucide-react";

type MarketMode = "all" | "cn" | "us";

const mainTabs = [
  { value: "all" as const, label: "全部" },
  { value: "cn" as const, label: "A股" },
  { value: "us" as const, label: "美股" },
];

const marketSubnav = [
  { path: "/market/", label: "市场", icon: TrendingUp },
  { path: "/review/", label: "复盘", icon: ClipboardList },
  { path: "/research/", label: "研究", icon: Microscope },
  { path: "/search", label: "搜索", icon: Search },
  { path: "/alerts", label: "盯盘", icon: Bell },
];

const allSubnav = [
  { path: "/", label: "首页", icon: Home },
  { path: "/about/", label: "关于", icon: Info },
];

const marketPaths = new Set(marketSubnav.map((item) => item.path));

function normalizePath(pathname: string): string {
  if (pathname !== "/" && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function isActive(pathname: string, href: string): boolean {
  const current = normalizePath(pathname);
  if (href === "/") return current === "/";
  return current === normalizePath(href) || current.startsWith(`${normalizePath(href)}/`);
}

function BottomNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawMarket = searchParams.get("market");
  const isMarketPage = marketPaths.has(normalizePath(pathname));
  const mode: MarketMode = rawMarket === "us" || rawMarket === "cn" ? rawMarket : isMarketPage ? "cn" : "all";
  const subnav = mode === "all" ? allSubnav : marketSubnav;
  const marketQuery = mode === "us" ? "?market=us" : "?market=cn";

  return (
    <nav className="neo-navbar fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ borderRadius: "20px 20px 0 0", boxShadow: "0 -4px 16px rgba(0,0,0,0.45)" }}>
      <div className="px-2 pt-1.5">
        <div className="grid grid-cols-3 gap-1">
          {mainTabs.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value === "all" ? "/" : `/market/${tab.value === "us" ? "?market=us" : "?market=cn"}`}
              aria-label={tab.label}
              className={`rounded-xl px-2 py-1 text-center text-[10px] font-semibold ${
                mode === tab.value ? "neo-chip-active" : "text-neo-dim"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center justify-between pb-1 pt-0.5">
          {subnav.map((item) => {
            const Icon = item.icon;
            const href = item.path === "/" || item.path === "/about/" ? item.path : `${item.path}${marketQuery}`;
            const active = isActive(pathname, item.path);
            return (
              <Link
                key={`${mode}-${item.path}`}
                href={href}
                aria-label={item.label}
                className={`flex min-w-[44px] flex-col items-center gap-0.5 rounded-xl px-2 py-1 ${
                  active ? "neo-chip-active" : "text-neo-dim"
                }`}
              >
                <Icon size={15} strokeWidth={active ? 2.3 : 1.7} />
                <span className={`text-[9px] ${active ? "font-semibold" : "font-medium"}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function BottomNav() {
  return (
    <Suspense fallback={<div className="neo-navbar fixed bottom-0 left-0 right-0 h-16 md:hidden" />}>
      <BottomNavContent />
    </Suspense>
  );
}
