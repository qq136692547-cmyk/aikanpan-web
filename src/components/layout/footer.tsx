import { BarChart3 } from "lucide-react";

export function Footer({ dataSource = "第三方行情源" }: { dataSource?: string }) {
  return (
    <footer className="neo-page border-t border-[var(--neo-surface-inset)]">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-h-11 items-center gap-2">
            <div className="neo-card-sm flex h-8 w-8 items-center justify-center" style={{ borderRadius: 9 }}>
              <BarChart3 size={15} style={{ color: "var(--neo-primary)" }} aria-hidden />
            </div>
            <span className="text-[12px] text-neo-mid">爱看盘 · 每日复盘工具</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[12px] text-neo-dim">
            <a href="/stocks/" className="inline-flex min-h-11 items-center px-2 transition-colors hover:text-neo-primary md:min-h-8">热门股票</a>
            <a href="/market/limit-up/" className="inline-flex min-h-11 items-center px-2 transition-colors hover:text-neo-primary md:min-h-8">涨停复盘</a>
            <a href="/market/fund-flow/" className="inline-flex min-h-11 items-center px-2 transition-colors hover:text-neo-primary md:min-h-8">资金流向</a>
            <a href="/market/temperature/" className="inline-flex min-h-11 items-center px-2 transition-colors hover:text-neo-primary md:min-h-8">市场温度</a>
            <a href="/about/" className="inline-flex min-h-11 items-center px-2 transition-colors hover:text-neo-primary md:min-h-8">关于</a>
            <a href="/api-docs/" className="inline-flex min-h-11 items-center px-2 transition-colors hover:text-neo-primary md:min-h-8">API</a>
            <a href="/privacy/" className="inline-flex min-h-11 items-center px-2 transition-colors hover:text-neo-primary md:min-h-8">隐私</a>
            <a href="/terms/" className="inline-flex min-h-11 items-center px-2 transition-colors hover:text-neo-primary md:min-h-8">协议</a>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center px-2 transition-colors hover:text-neo-primary md:min-h-8">渝ICP备2026014729号-1</a>
            <span className="inline-flex min-h-11 items-center px-2 md:min-h-8">数据：{dataSource}</span>
          </div>
        </div>
        <div className="mt-2 flex flex-col gap-1 border-t border-[var(--neo-surface-inset)] pt-3 text-[12px] text-neo-dim sm:flex-row sm:items-center sm:gap-4">
          <span>微信：denglio0</span>
          <a href="mailto:qq136692547@gmail.com" className="inline-flex min-h-11 items-center transition-colors hover:text-neo-primary sm:min-h-8">qq136692547@gmail.com</a>
        </div>
        <p className="mt-1 text-[12px] text-neo-mid opacity-80">
          本站为行情数据与研究辅助工具，不具备证券投资咨询资格；数据取自第三方公开接口，可能存在延迟，AI 内容可能存在错误。仅供参考，不构成投资建议，盈亏自负。
          <a href="/terms/" className="ml-1 underline hover:text-neo-primary">完整免责条款</a>
        </p>
      </div>
    </footer>
  );
}
