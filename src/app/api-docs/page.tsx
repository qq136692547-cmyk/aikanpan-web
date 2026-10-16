import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "API 文档",
  description: "爱看盘后端API接口文档与完整接口清单。",
  alternates: { canonical: "/api-docs/" },
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
  { method: "GET", path: "/api/v1/stocks/search", desc: "搜索股票 (q 参数，keyword 兼容)" },
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
  { method: "GET", path: "/api/v1/us/stocks/{symbol}/filings", desc: "美股 SEC 官方披露" },
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

        <section className="neo-fade-up mt-6" style={{ animationDelay: "30ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-neo-mid">接口鉴权与调用配额</h2>
          <div className="neo-card p-4 space-y-3">
            <p className="text-sm text-neo-mid leading-relaxed">
              爱看盘 API 服务提供基础开放接口与高频/管理受保护接口。调用受保护接口或获取更高调用限额时，需在请求头携带 API Key 进行身份认证。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="neo-inset p-3 rounded">
                <span className="font-semibold text-neo-ink block mb-1">公开基础接口（匿名访问）</span>
                <p className="text-neo-dim leading-relaxed">
                  提供基础行情、K线、指标与健康状态查询。按客户端 IP 自动限流，基准配额为 <strong>600 次/分钟</strong>。超限将返回 HTTP 429。
                </p>
              </div>
              <div className="neo-inset p-3 rounded">
                <span className="font-semibold text-neo-ink block mb-1">受保护接口（API Key 鉴权）</span>
                <p className="text-neo-dim leading-relaxed">
                  管理与内部数据接口强制要求有效 Key；请求头须携带 <code style={{ fontFamily: "var(--font-inter), system-ui" }} className="text-brand">X-API-Key: &lt;secret&gt;</code>。Key 配额为 <strong>1200 次/分钟</strong>。
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-neo-dim">
              <span>状态码规范：</span>
              <span><code className="text-neo-up font-mono">200 OK</code> 正常响应</span>
              <span><code className="text-[#e3b341] font-mono">401 Unauthorized</code> 未提供或无效 Key</span>
              <span><code className="text-neo-down font-mono">429 Too Many Requests</code> 超出频次配额</span>
            </div>
            <p className="text-xs text-neo-dim border-t border-[var(--neo-edge)] pt-2">
              注：健康检查接口 <code style={{ fontFamily: "var(--font-inter), system-ui" }} className="text-brand">/api/v1/health</code> 仅对外返回系统存活状态与服务版本，内部缓存与数据源指标已对公网收敛。
            </p>
          </div>
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
            <pre style={{ fontFamily: 'var(--font-inter), system-ui' }} className="text-xs leading-relaxed text-neo-mid overflow-x-auto"><code>{`# 基础接口（无需 Key）
curl https://aikanpan.top/api/v1/workbench/dashboard

# 携带 API Key 调用（自定义高配额/受保护接口）
curl -H "X-API-Key: your_api_key_here" https://aikanpan.top/api/v1/stocks/sh.600519/quote

# 搜索股票
curl "https://aikanpan.top/api/v1/stocks/search?q=300414"

# 个股行情
curl https://aikanpan.top/api/v1/stocks/sz.300414/quote

# 个股AI事件摘要
curl https://aikanpan.top/api/v1/stocks/sz.300414/events

# 美股 SEC 官方披露
curl https://aikanpan.top/api/v1/us/stocks/AAPL/filings`}</code></pre>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
