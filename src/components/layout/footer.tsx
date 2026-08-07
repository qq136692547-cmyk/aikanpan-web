export function Footer() {
  return (
    <footer className="neo-page border-t border-[var(--neo-surface-inset)]">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="neo-card-sm flex h-6 w-6 items-center justify-center" style={{ borderRadius: 8 }}>
              <span className="text-[11px]">📊</span>
            </div>
            <span className="text-[12px] text-neo-mid">爱看盘 · AI 复盘工具</span>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-neo-dim">
            <a href="/about/" className="transition-colors hover:text-neo-primary">关于</a>
            <a href="/api-docs/" className="transition-colors hover:text-neo-primary">API</a>
            <a href="/privacy/" className="transition-colors hover:text-neo-primary">隐私</a>
            <span>数据：东方财富</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-neo-mid opacity-70">
          ⚠ 本站数据仅供参考，不构成投资建议
        </p>
      </div>
    </footer>
  );
}
