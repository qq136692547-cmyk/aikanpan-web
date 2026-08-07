import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "API 文档",
  description: "爱看盘后端API接口文档，包含29个端点的完整说明。",
};

const apiEndpoints = [
  { method: "GET", path: "/api/v1/health", desc: "健康检查" },
  { method: "GET", path: "/api/v1/workbench/dashboard", desc: "工作台仪表盘 — 指数 + 涨跌停 + 强势行业" },
  { method: "GET", path: "/api/v1/workbench/daily-review", desc: "每日复盘数据" },
  { method: "GET", path: "/api/v1/workbench/insights", desc: "市场洞察 — 焦点 + 热门板块 + 新闻 + 研报" },
  { method: "GET", path: "/api/v1/market/sectors", desc: "行业板块行情列表" },
  { method: "GET", path: "/api/v1/market/sectors/{sector_code}/stocks", desc: "板块成分股列表" },
  { method: "GET", path: "/api/v1/stocks/{code}/quote", desc: "个股实时行情" },
  { method: "GET", path: "/api/v1/stocks/{code}/history", desc: "个股历史K线" },
  { method: "GET", path: "/api/v1/stocks/{code}/indicators", desc: "个股技术指标 (MA/MACD/KDJ/RSI)" },
  { method: "GET", path: "/api/v1/stocks/{code}/moneyflow", desc: "个股资金流向" },
  { method: "GET", path: "/api/v1/stocks/{code}/events", desc: "个股事件/AI摘要" },
  { method: "GET", path: "/api/v1/stocks/{code}/pattern", desc: "AI 形态识别" },
  { method: "GET", path: "/api/v1/stocks/{code}/financials", desc: "个股财务数据" },
  { method: "GET", path: "/api/v1/stocks/search", desc: "搜索股票 (keyword 参数)" },
  { method: "GET", path: "/api/v1/stocks/watchlist", desc: "自选股列表" },
  { method: "POST", path: "/api/v1/ai/comment", desc: "AI 个股点评" },
  { method: "POST", path: "/api/v1/ai/daily-review", desc: "AI 每日复盘生成" },
  { method: "POST", path: "/api/v1/ai/score-batch", desc: "AI 批量评分" },
  { method: "GET", path: "/api/v1/portfolio/positions", desc: "持仓列表" },
  { method: "POST", path: "/api/v1/portfolio/positions", desc: "添加持仓" },
  { method: "DELETE", path: "/api/v1/portfolio/positions/{position_id}", desc: "删除持仓" },
  { method: "GET", path: "/api/v1/portfolio/summary", desc: "持仓汇总" },
  { method: "GET", path: "/api/v1/alerts", desc: "预警列表" },
  { method: "POST", path: "/api/v1/alerts", desc: "创建预警" },
  { method: "PATCH", path: "/api/v1/alerts/{alert_id}", desc: "更新预警" },
  { method: "DELETE", path: "/api/v1/alerts/{alert_id}", desc: "删除预警" },
  { method: "GET", path: "/api/v1/alerts/triggered", desc: "已触发预警" },
  { method: "POST", path: "/api/v1/alerts/parse", desc: "解析预警指令" },
  { method: "POST", path: "/api/v1/feedback", desc: "提交反馈" },
  { method: "GET", path: "/api/v1/feedback", desc: "反馈列表" },
];

const methodColors: Record<string, string> = {
  GET: "text-neo-up",
  POST: "text-brand",
  PATCH: "text-[#e3b341]",
  DELETE: "text-neo-down",
};

export default function ApiDocsPage() {
  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
        <section className="neo-fade-up">
          <h1 className="text-xl font-bold text-neo-ink">API 文档</h1>
          <p className="mt-1 text-sm text-neo-mid">
            后端 Base URL: <code style={{ fontFamily: 'var(--font-inter), system-ui' }} className="neo-inset rounded px-1.5 py-0.5 text-xs text-brand">https://aikanpan.top/api/v1</code>
          </p>
        </section>

        <section className="neo-fade-up mt-6" style={{ animationDelay: "60ms" }}>
          <div className="neo-inset overflow-x-auto neo-scrollbar">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-[var(--neo-surface-inset)] text-[11px] uppercase tracking-wide text-neo-mid">
                  <th className="px-4 py-2 text-left font-medium">Method</th>
                  <th className="px-4 py-2 text-left font-medium">Path</th>
                  <th className="px-4 py-2 text-left font-medium">说明</th>
                </tr>
              </thead>
              <tbody>
                {apiEndpoints.map((ep) => (
                  <tr key={`${ep.method}-${ep.path}`} className="border-b border-[var(--neo-edge)] transition-colors hover-neo-inset last:border-b-0">
                    <td className="px-4 py-2.5">
                      <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className={`text-xs font-bold ${methodColors[ep.method] || "text-neo-mid"}`}>{ep.method}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-inter), system-ui' }} className="px-4 py-2.5 font-mono text-xs text-neo-ink">{ep.path}</td>
                    <td className="px-4 py-2.5 text-xs text-neo-mid">{ep.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="neo-fade-up mt-6" style={{ animationDelay: "120ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-neo-mid">股票代码格式</h2>
          <div className="neo-card p-4">
            <p className="text-sm text-neo-mid">后端使用 <code style={{ fontFamily: 'var(--font-inter), system-ui' }} className="neo-inset rounded px-1 py-0.5 text-xs text-brand">exchange.code</code> 格式：</p>
            <ul className="mt-3 space-y-1.5 text-xs">
              <li className="flex items-center gap-3">
                <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className="neo-up-soft rounded px-2 py-0.5 text-neo-up">sh.600518</span>
                <span className="text-neo-dim">上海证券交易所 (6开头)</span>
              </li>
              <li className="flex items-center gap-3">
                <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className="neo-up-soft rounded px-2 py-0.5 text-neo-up">sz.300414</span>
                <span className="text-neo-dim">深圳证券交易所 (0/3开头)</span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-neo-dim">Web 路由同时支持 <code style={{ fontFamily: 'var(--font-inter), system-ui' }}>sz300414</code> 和 <code style={{ fontFamily: 'var(--font-inter), system-ui' }}>sz.300414</code> 两种格式。</p>
          </div>
        </section>

        <section className="neo-fade-up mt-6" style={{ animationDelay: "180ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-neo-mid">示例</h2>
          <div className="neo-inset p-4">
            <pre style={{ fontFamily: 'var(--font-inter), system-ui' }} className="text-xs leading-relaxed text-neo-mid overflow-x-auto"><code>{`# 获取仪表盘数据
curl https://aikanpan.top/api/v1/workbench/dashboard

# 搜索股票
curl "https://aikanpan.top/api/v1/stocks/search?keyword=300414"

# 个股行情
curl https://aikanpan.top/api/v1/stocks/sz.300414/quote

# 个股AI事件摘要
curl https://aikanpan.top/api/v1/stocks/sz.300414/events`}</code></pre>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
