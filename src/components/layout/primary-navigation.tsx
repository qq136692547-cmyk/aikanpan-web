"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type MarketMode = "all" | "cn" | "us";

const mainModes: { value: MarketMode; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "cn", label: "A股" },
  { value: "us", label: "美股" },
];

const marketSubnav = [
  { path: "/market/", label: "市场" },
  { path: "/review/", label: "复盘" },
  { path: "/research/", label: "研究" },
  { path: "/search", label: "搜索" },
  { path: "/alerts", label: "盯盘" },
];

const allSubnav = [
  { path: "/", label: "首页" },
  { path: "/about/", label: "关于" },
];

function normalizePath(pathname: string): string {
  if (pathname !== "/" && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

const marketPaths = new Set(marketSubnav.map((item) => normalizePath(item.path)));

function isActive(pathname: string, href: string): boolean {
  const current = normalizePath(pathname);
  if (href === "/") return current === "/";
  return current === normalizePath(href) || current.startsWith(`${normalizePath(href)}/`);
}

export function PrimaryNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawMarket = searchParams.get("market");
  const isMarketPage = marketPaths.has(normalizePath(pathname));
  const mode: MarketMode = rawMarket === "us" || rawMarket === "cn" ? rawMarket : isMarketPage ? "cn" : "all";
  const subnav = mode === "all" ? allSubnav : marketSubnav;
  const marketQuery = mode === "us" ? "?market=us" : "?market=cn";

  function selectMode(next: MarketMode) {
    if (next === mode) return;

    if (next === "all") {
      const target = pathname === "/about/" || pathname === "/about" ? "/about/" : "/";
      router.push(target);
      return;
    }

    const query = next === "us" ? "?market=us" : "?market=cn";
    if (isMarketPage) {
      router.push(`${normalizePath(pathname)}${query}`);
    } else {
      router.push(`/market/${query}`);
    }
  }

  return (
    <div className="hidden items-center gap-3 lg:flex">
      <div className="flex items-center gap-1" role="tablist" aria-label="市场范围">
        {mainModes.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={mode === item.value}
            onClick={() => selectMode(item.value)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
              mode === item.value ? "neo-chip-active" : "neo-chip"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <span className="h-4 w-px bg-[var(--neo-surface-inset)]" aria-hidden />

      <nav className="flex items-center gap-1" aria-label="功能导航">
        {subnav.map((item) => {
          const href = item.path === "/" || item.path === "/about/" ? item.path : `${item.path}${marketQuery}`;
          const active = isActive(pathname, item.path);
          return (
            <Link
              key={`${mode}-${item.path}`}
              href={href}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                active ? "neo-chip-active" : "neo-chip"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function MobileNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawMarket = searchParams.get("market");
  const isMarketPage = marketPaths.has(normalizePath(pathname));
  const mode: MarketMode = rawMarket === "us" || rawMarket === "cn" ? rawMarket : isMarketPage ? "cn" : "all";
  const subnav = mode === "all" ? allSubnav : marketSubnav;
  const marketQuery = mode === "us" ? "?market=us" : "?market=cn";

  function go(next: MarketMode) {
    onNavigate?.();
    if (next === mode) return;
    if (next === "all") {
      router.push(pathname === "/about/" || pathname === "/about" ? "/about/" : "/");
    } else {
      const query = next === "us" ? "?market=us" : "?market=cn";
      if (isMarketPage) {
        router.push(`${normalizePath(pathname)}${query}`);
      } else {
        router.push(`/market/${query}`);
      }
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {mainModes.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={mode === item.value}
            onClick={() => go(item.value)}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold ${
              mode === item.value ? "neo-chip-active" : "neo-chip"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {subnav.map((item) => {
          const href = item.path === "/" || item.path === "/about/" ? item.path : `${item.path}${marketQuery}`;
          const active = isActive(pathname, item.path);
          return (
            <Link
              key={`${mode}-${item.path}-mobile`}
              href={href}
              onClick={onNavigate}
              className={`rounded-full px-4 py-2 text-[13px] ${active ? "neo-chip-active" : "neo-chip"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
