export function Footer() {
  return (
    <footer className="mt-12 border-t border-[var(--border-subtle)] bg-[var(--bg-base)]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-6 py-6">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="font-medium text-[var(--text-secondary)]">爱看盘</span>
          <span className="text-[var(--text-tertiary)]">AI 股票复盘工具</span>
          <span className="hidden text-[var(--border-default)] sm:inline">|</span>
          <a href="/about" className="text-[var(--text-tertiary)] transition-fast hover:text-[var(--text-secondary)]">关于</a>
          <a href="/api-docs/" className="text-[var(--text-tertiary)] transition-fast hover:text-[var(--text-secondary)]">API</a>
          <a href="https://github.com/zqj372-ops/daily_stock_analysis_workbench" target="_blank" rel="noopener noreferrer" className="text-[var(--text-tertiary)] transition-fast hover:text-[var(--text-secondary)]">开源</a>
        </div>
        <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
          数据来源：东方财富、新浪财经。页面数据仅供参考，不构成任何投资建议。投资有风险，入市需谨慎。
        </p>
      </div>
    </footer>
  );
}
