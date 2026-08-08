"use client";
import { usePathname } from "next/navigation";
import { Bell, ClipboardList, Home, Info, Microscope, Search, TrendingUp, UserRound } from "lucide-react";

const tabs = [
  { href: "/", label: "首页", icon: Home },
  { href: "/market/", label: "市场", icon: TrendingUp },
  { href: "/research/", label: "研究", icon: Microscope },
  { href: "/search", label: "搜索", icon: Search },
  { href: "/alerts", label: "盯盘", icon: Bell },
  { href: "/review/", label: "复盘", icon: ClipboardList },
  { href: "/account", label: "账户", icon: UserRound },
  { href: "/about/", label: "关于", icon: Info },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="neo-navbar fixed bottom-0 left-0 right-0 z-50 md:hidden"
         style={{ borderRadius: "20px 20px 0 0", boxShadow: "0 -4px 16px rgba(0,0,0,0.45)" }}>
      <div className="flex items-center justify-between px-1 py-2">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <a
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-all duration-200 ${
                active ? "neo-chip-active" : "text-neo-dim"
              }`}
              style={{ minWidth: "44px", minHeight: "44px" }}
            >
              <Icon size={16} strokeWidth={active ? 2.4 : 1.8} />
              <span className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}>{tab.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
