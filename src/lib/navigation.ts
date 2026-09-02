export type MarketMode = "all" | "cn" | "us";

export type NavigationCrumb = {
  label: string;
  href?: string;
};

export type NavigationContext = {
  scope: MarketMode;
  activePath: string | null;
  breadcrumb: NavigationCrumb[];
  showBreadcrumb: boolean;
  supportsMarketSwitch: boolean;
  basePath: string;
};

export const MAIN_MODES: { value: MarketMode; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "cn", label: "A股" },
  { value: "us", label: "美股" },
];

export const MARKET_SUBNAV = [
  { path: "/market/", label: "市场" },
  { path: "/review/", label: "复盘" },
  { path: "/research/", label: "研究" },
  { path: "/search", label: "搜索" },
  { path: "/alerts", label: "盯盘" },
];

export const ALL_SUBNAV = [
  { path: "/", label: "首页" },
  { path: "/about/", label: "关于" },
];

export function normalizeNavigationPath(pathname: string): string {
  if (pathname !== "/" && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function isCnStockCode(code: string): boolean {
  return /^(sh|sz|bj)\d{6}$/i.test(code) || /^\d{6}$/.test(code);
}

function marketQuery(scope: MarketMode): string {
  return scope === "us" ? "market=us" : "market=cn";
}

export function marketHref(scope: "cn" | "us"): string {
  return `/market/?${marketQuery(scope)}`;
}

function marketScopeFromParam(raw?: string | null): "cn" | "us" {
  return raw === "us" || raw === "cn" ? raw : "cn";
}

export function resolveNavigationContext(pathname: string, search = ""): NavigationContext {
  const current = normalizeNavigationPath(pathname);
  const params = new URLSearchParams(search);
  const segments = current.split("/").filter(Boolean);
  const first = segments[0] || "";
  const marketScope = marketScopeFromParam(params.get("market"));

  if (!first) {
    return { scope: "all", activePath: "/", breadcrumb: [], showBreadcrumb: false, supportsMarketSwitch: false, basePath: "/" };
  }

  if (first === "about") {
    return { scope: "all", activePath: "/about", breadcrumb: [], showBreadcrumb: false, supportsMarketSwitch: false, basePath: "/about" };
  }

  if (first === "market" || first === "review" || first === "research" || first === "search" || first === "alerts") {
    const subnav = MARKET_SUBNAV.find((item) => normalizeNavigationPath(item.path) === current);
    return {
      scope: marketScope,
      activePath: subnav ? normalizeNavigationPath(subnav.path) : current,
      breadcrumb: [],
      showBreadcrumb: false,
      supportsMarketSwitch: true,
      basePath: current,
    };
  }

  if (first === "stock") {
    const code = decodeURIComponent(segments[1] || "").toUpperCase();
    const scope: "cn" | "us" = isCnStockCode(code) ? "cn" : "us";
    return {
      scope,
      activePath: "/market",
      breadcrumb: [
        { label: scope === "cn" ? "A股" : "美股", href: marketHref(scope) },
        { label: "市场", href: marketHref(scope) },
        { label: `个股 ${code}` },
      ],
      showBreadcrumb: true,
      supportsMarketSwitch: false,
      basePath: current,
    };
  }

  if (first === "portfolio") {
    const scope: "cn" | "us" = marketScope;
    return {
      scope,
      activePath: "/research",
      breadcrumb: [
        { label: scope === "cn" ? "A股" : "美股", href: `/research/?${marketQuery(scope)}` },
        { label: "研究", href: `/research/?${marketQuery(scope)}` },
        { label: "持仓组合" },
      ],
      showBreadcrumb: true,
      supportsMarketSwitch: true,
      basePath: current,
    };
  }

  if (first === "dashboard" || first === "etf" || first === "fund") {
    const label = first === "dashboard" ? "仪表盘" : first === "etf" ? "ETF 行情" : "基金";
    return {
      scope: "cn",
      activePath: "/market",
      breadcrumb: [
        { label: "A股", href: marketHref("cn") },
        { label: "市场", href: marketHref("cn") },
        { label },
      ],
      showBreadcrumb: true,
      supportsMarketSwitch: false,
      basePath: current,
    };
  }

  if (first === "upgrade" || first === "account") {
    const label = first === "upgrade" ? "会员" : "我的账户";
    return {
      scope: "all",
      activePath: null,
      breadcrumb: [
        { label: "全部", href: "/" },
        { label },
      ],
      showBreadcrumb: true,
      supportsMarketSwitch: false,
      basePath: current,
    };
  }

  if (first === "api-docs" || first === "privacy" || first === "terms") {
    const label = first === "api-docs" ? "API" : first === "privacy" ? "隐私政策" : "服务协议";
    return {
      scope: "all",
      activePath: "/about",
      breadcrumb: [
        { label: "全部", href: "/" },
        { label: "关于", href: "/about/" },
        { label },
      ],
      showBreadcrumb: true,
      supportsMarketSwitch: false,
      basePath: current,
    };
  }

  if (first === "admin") {
    return {
      scope: "all",
      activePath: null,
      breadcrumb: [
        { label: "全部", href: "/" },
        { label: "后台" },
        { label: "会员管理" },
      ],
      showBreadcrumb: true,
      supportsMarketSwitch: false,
      basePath: current,
    };
  }

  return {
    scope: "all",
    activePath: null,
    breadcrumb: [
      { label: "全部", href: "/" },
      { label: "页面" },
    ],
    showBreadcrumb: true,
    supportsMarketSwitch: false,
    basePath: current,
  };
}

export function marketModeHref(context: NavigationContext, next: MarketMode): string {
  if (next === "all") {
    return context.scope === "all" && normalizeNavigationPath("/about") === context.basePath ? "/about/" : "/";
  }
  if (context.supportsMarketSwitch) {
    return `${context.basePath}?${marketQuery(next)}`;
  }
  return marketHref(next);
}

export function getNavigationSubnav(scope: MarketMode) {
  return scope === "all" ? ALL_SUBNAV : MARKET_SUBNAV;
}
