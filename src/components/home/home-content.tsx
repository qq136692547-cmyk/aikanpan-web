import Link from "next/link";

/**
 * 首页 SEO 内容区 —— 为 AI 搜索引擎提供可引用的结构化内容。
 */
export function HomeContent() {
  return (
    <section className="mt-6 space-y-6" aria-label="产品介绍">
      <div className="neo-card p-6">
        <h2 className="text-base font-bold text-neo-ink">为什么选择爱看盘</h2>
        <p className="mt-2 text-sm leading-relaxed text-neo-mid">
          爱看盘是一款开源的 A 股与美股复盘工具，专为个人投资者打造。
          每天开盘前看一眼市场温度，收盘后花三分钟读 AI 复盘，盘中用自然语言设好盯盘提醒——
          这就是爱看盘帮你建立的每日决策节奏。数据来自
          <a href="https://www.eastmoney.com" target="_blank" rel="noopener noreferrer" className="text-brand hover:opacity-80">东方财富</a>、
          <a href="https://finance.sina.com.cn" target="_blank" rel="noopener noreferrer" className="text-brand hover:opacity-80">新浪财经</a>、
          <a href="https://www.sse.com.cn" target="_blank" rel="noopener noreferrer" className="text-brand hover:opacity-80">上海证券交易所</a>、
          <a href="https://www.szse.cn" target="_blank" rel="noopener noreferrer" className="text-brand hover:opacity-80">深圳证券交易所</a>、
          <a href="https://finnhub.io" target="_blank" rel="noopener noreferrer" className="text-brand hover:opacity-80">Finnhub</a>
          等公开行情接口，AI 内容由大语言模型生成，不构成投资建议。
        </p>
      </div>

      <div className="neo-card p-6">
        <h2 className="text-base font-bold text-neo-ink">核心功能</h2>
        <ul className="mt-3 space-y-2 text-sm text-neo-mid">
          <li className="flex gap-2"><span className="text-brand">●</span><span><strong className="text-neo-ink">实时行情</strong>：三大指数、涨跌停个股、强势行业板块，一屏概览</span></li>
          <li className="flex gap-2"><span className="text-brand">●</span><span><strong className="text-neo-ink">AI 复盘</strong>：收盘后自动生成市场摘要、风险提示与明日关注点</span></li>
          <li className="flex gap-2"><span className="text-brand">●</span><span><strong className="text-neo-ink">个股诊断</strong>：输入代码即可获得 AI 结构化评分、状态判断与决策参考</span></li>
          <li className="flex gap-2"><span className="text-brand">●</span><span><strong className="text-neo-ink">智能盯盘</strong>：用自然语言创建盯盘任务（"贵州茅台跌破 1600 就提醒我"），到价自动推送</span></li>
          <li className="flex gap-2"><span className="text-brand">●</span><span><strong className="text-neo-ink">美股研究台</strong>：自选股、盘前计划、公司档案、投资论点与 AI 评分</span></li>
        </ul>
      </div>

      <div className="neo-card p-6">
        <h2 className="text-base font-bold text-neo-ink">如何用爱看盘做每日复盘</h2>
        <ol className="mt-3 space-y-3 text-sm text-neo-mid">
          <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand">1</span><span><strong className="text-neo-ink">开盘前</strong>：打开首页查看市场温度和隔夜美股表现，判断今日仓位倾向</span></li>
          <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand">2</span><span><strong className="text-neo-ink">盘中</strong>：在盯盘页设置条件提醒，不用一直盯盘，到价自动通知</span></li>
          <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand">3</span><span><strong className="text-neo-ink">收盘后</strong>：打开复盘页，读 AI 生成的当日市场总结和涨跌停分析</span></li>
          <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand">4</span><span><strong className="text-neo-ink">选股时</strong>：在搜索页输入股票代码，获取 AI 结构化诊断和评分</span></li>
          <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand">5</span><span><strong className="text-neo-ink">睡前</strong>：在研究台更新投资论点，美股夜盘数据次日同步</span></li>
        </ol>
      </div>

      <div className="neo-card p-6">
        <h2 className="text-base font-bold text-neo-ink">免费版与 AI 版功能对比</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm text-neo-mid">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="pb-2 pr-4 font-medium text-neo-dim">功能</th>
                <th className="pb-2 px-4 font-medium text-neo-dim">免费版</th>
                <th className="pb-2 px-4 font-medium text-neo-dim">AI 会员版</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr><td className="py-2 pr-4">实时行情</td><td className="py-2 px-4">✓</td><td className="py-2 px-4">✓</td></tr>
              <tr><td className="py-2 pr-4">AI 每日复盘</td><td className="py-2 px-4">每日 1 次</td><td className="py-2 px-4">无限次</td></tr>
              <tr><td className="py-2 pr-4">个股 AI 诊断</td><td className="py-2 px-4">每日 5 次</td><td className="py-2 px-4">无限次</td></tr>
              <tr><td className="py-2 pr-4">智能盯盘提醒</td><td className="py-2 px-4">3 个任务</td><td className="py-2 px-4">无限任务</td></tr>
              <tr><td className="py-2 pr-4">美股研究台</td><td className="py-2 px-4">基础查看</td><td className="py-2 px-4">AI 论点 + 评分</td></tr>
              <tr><td className="py-2 pr-4">批量涨停评分</td><td className="py-2 px-4">—</td><td className="py-2 px-4">✓</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="neo-card p-6">
        <h2 className="text-base font-bold text-neo-ink">常见问题</h2>
        <div className="mt-3 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-neo-ink">爱看盘的数据可靠吗？</h3>
            <p className="mt-1 text-xs leading-relaxed text-neo-dim">
              行情数据来自东方财富、新浪财经、Finnhub、EODHD 等公开接口，
              我们不做二次加工，直接呈现原始数值。AI 内容由大语言模型生成，仅供参考，不构成投资建议。
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-neo-ink">爱看盘支持美股吗？</h3>
            <p className="mt-1 text-xs leading-relaxed text-neo-dim">
              支持。美股覆盖真实行情、K 线、新闻、AI 解读、自选、持仓、交易流水、盯盘提醒、财报盈利数据与研究台。
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-neo-ink">盯盘提醒怎么用？</h3>
            <p className="mt-1 text-xs leading-relaxed text-neo-dim">
              在盯盘页用自然语言输入条件，例如"贵州茅台跌破 1600 就提醒我"，
              系统会自动解析并持续监控，满足条件后触发浏览器通知并记录触发历史。
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-neo-ink">爱看盘收费吗？</h3>
            <p className="mt-1 text-xs leading-relaxed text-neo-dim">
              基础功能免费使用，AI 高频功能需要激活码开通会员。当前为测试期，可在<Link href="/about/" className="text-brand hover:opacity-80">关于页</Link>关注最新动态。
            </p>
          </div>
        </div>
      </div>

      <div className="text-xs text-neo-dim">
        爱看盘同时提供鸿蒙原生 APP 版本，让你随时随地查看行情和接收盯盘提醒。无论是短线盯盘、中长线研究还是新手学习，爱看盘都能为你提供合适的功能和视角。本站所有数据仅供参考，不构成投资建议，投资有风险，入市需谨慎。作者：爱看盘团队 · 更新日期：2026-09-04 ·
        <a href="https://github.com/qq136692547-cmyk/aikanpan-web" target="_blank" rel="noopener noreferrer" className="text-brand hover:opacity-80">GitHub</a>
      </div>
    </section>
  );
}