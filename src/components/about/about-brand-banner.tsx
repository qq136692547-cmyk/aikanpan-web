export function AboutBrandBanner() {
  const points =
    "0,92 60,74 120,84 180,56 240,66 300,42 360,54 420,32 480,48 540,26 600,38 660,18 720,30 800,12";

  return (
    <div className="neo-card scanline relative mb-6 h-56 overflow-hidden rounded-2xl sm:h-72">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0e1017] via-[#121624] to-[#0b0e14]" />
      <svg
        viewBox="0 0 800 120"
        preserveAspectRatio="none"
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
      >
        <polyline
          points={points}
          fill="none"
          stroke="var(--neo-up-text)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="kline-glow"
        />
        <polyline
          points={points}
          fill="none"
          stroke="var(--neo-up-text)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="kline-draw"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--neo-bg)]/85 to-transparent" />
      <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="pulse-dot h-2 w-2 rounded-full bg-[var(--neo-up)]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-neo-dim">
              爱看盘 · AI 复盘工具
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-neo-ink sm:text-3xl">让市场复盘更快一步</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-neo-mid">
            实时行情、AI 诊断与智能盯盘，一站式辅助 A 股投资决策。
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neo-dim">
          <span>腾讯行情</span>
          <span>·</span>
          <span>东方财富</span>
          <span>·</span>
          <span>财联社</span>
        </div>
      </div>
    </div>
  );
}
