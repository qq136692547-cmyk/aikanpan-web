import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export function MarketPageFrame({ children, scripts, market }: { children: ReactNode; scripts?: ReactNode; market?: "cn" | "hk" | "us" }) {
  // F7：页脚数据源统一改为中性表述，不再展示具体数据源商标名。
  // 具体数据源名称仅保留在隐私政策 / 服务条款的合规披露中。
  const dataSource = market === "us" ? "第三方美股行情源" : market === "hk" ? "第三方港股行情源" : "第三方A股行情源";
  return (
    <div className="neo-page">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-3 sm:px-6 sm:py-4">{children}</main>
      <Footer dataSource={dataSource} />
      {scripts}
    </div>
  );
}

export function MarketPageHeader({
  market,
  title,
  subtitle,
  image,
  meta,
  actions,
}: {
  market: "cn" | "hk" | "us";
  title: string;
  subtitle?: string;
  image: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  const marketLabel = market === "cn" ? "A股" : market === "hk" ? "港股" : "美股";

  return (
    <section className="relative overflow-hidden rounded-xl">
      <img
        loading="lazy"
        src={image}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
      />
      <div className="relative flex flex-wrap items-center justify-between gap-3 py-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-bold text-neo-ink">{title}</h1>
            <span className="neo-chip px-2 py-0.5 text-[10px] font-semibold text-neo-ink-mid">{marketLabel}</span>
          </div>
          {subtitle && <p className="mt-0.5 truncate text-[11px] text-neo-dim">{subtitle}</p>}
        </div>
        {(meta || actions) && (
          <div className="flex flex-wrap items-center gap-2">
            {meta}
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}

export function MarketPageSection({
  title,
  action,
  children,
  className = "mt-4",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-neo-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
