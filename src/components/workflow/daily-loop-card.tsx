import Link from "next/link";
import { BellRing, ShieldAlert, TrendingUp } from "lucide-react";

function riskText(market: "cn" | "us", value?: string) {
  return value || (market === "us" ? "美股暂无额外风险提示" : "暂无额外风险提示");
}

export function DailyLoopCard({
  market,
  conclusion,
  focus,
  risk,
}: {
  market: "cn" | "us";
  conclusion?: string;
  focus: string[];
  risk?: string;
}) {
  const query = market === "us" ? "?market=us" : "?market=cn";

  return (
    <section aria-label="今日决策闭环" className="neo-card mt-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold text-neo-ink">今日决策闭环</h2>
          <p className="mt-0.5 text-[11px] text-neo-dim">先看结论，再定关注，最后落到一条提醒。</p>
        </div>
        <Link href={`/alerts${query}`} className="neo-btn-primary flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium">
          <BellRing size={13} />
          设置提醒
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-3">
        <div className="neo-inset rounded-md p-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color: "var(--neo-primary)" }} />
            <span className="text-[12px] font-medium text-neo-ink">今日结论</span>
          </div>
          <p className="mt-2 line-clamp-4 text-[12px] leading-relaxed text-neo-mid">
            {conclusion || "今日复盘生成中，稍后回来看。"}
          </p>
        </div>

        <div className="neo-inset rounded-md p-3">
          <div className="text-[12px] font-medium text-neo-ink">今日关注</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {focus.length ? focus.map((item) => (
              <span key={item} className="neo-chip px-2 py-0.5 text-[11px] text-neo-mid">{item}</span>
            )) : (
              <span className="text-[12px] text-neo-mid">暂无热点方向</span>
            )}
          </div>
        </div>

        <div className="neo-inset rounded-md p-3">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} style={{ color: "var(--neo-amber)" }} />
            <span className="text-[12px] font-medium text-neo-ink">风险提醒</span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-neo-mid">{riskText(market, risk)}</p>
        </div>
      </div>
    </section>
  );
}
