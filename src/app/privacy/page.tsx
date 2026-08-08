import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "隐私政策",
  description: "爱看盘网站的隐私政策，说明信息收集、使用、存储、统计分析与用户权利。",
};

const sections = [
  {
    title: "适用范围",
    content: "本政策适用于爱看盘网站（https://aikanpan.top）及后续提供的客户端，说明我们如何处理与行情浏览、自选管理、复盘笔记、持仓记录、价格提醒和意见反馈相关的信息。",
  },
  {
    title: "我们处理的信息",
    content: "我们会处理你主动输入或使用服务时产生的数据，包括游客账号标识、自选股、搜索与复盘内容、计划、持仓与交易记录、价格提醒、意见反馈，以及 AI 分析请求记录。",
  },
  {
    title: "游客登录与账号",
    content: "首次访问时，网站会自动创建游客账号并将数据同步至服务器（https://aikanpan.top/api/v1）。绑定手机号后可用于后续登录和跨设备恢复；未绑定手机号时，只能通过当前设备的登录状态访问，其他设备无法恢复数据。",
  },
  {
    title: "数据存储与同步",
    content: "自选股、计划、持仓、交易流水、复盘笔记、提醒设置等数据保存在服务器，用于跨设备同步与功能恢复。删除数据可通过页面操作或联系客服处理。",
  },
  {
    title: "信息使用方式",
    content: "上述信息用于提供行情展示、AI 复盘与个股分析、自选与持仓管理、价格提醒和反馈处理。AI 请求会发送至服务端并由模型生成结果后返回。",
  },
  {
    title: "访问统计与留存分析",
    content: "为改进产品，我们会以第一方统计方式记录页面访问、首次访问、回访和功能使用事件。访问者使用不可逆哈希后的去标识化标识，不采集 IP 明细、设备指纹、账号密码或持仓明细。统计仅用于分析日活、回访与 D1/D7/D30 留存，不接入第三方统计或广告 SDK。",
  },
  {
    title: "数据来源与第三方",
    content: "行情与资讯数据来自东方财富、新浪财经等第三方平台。我们不对数据的准确性、完整性和及时性作保证，也不会转售第三方行情数据。部分数据源的商用授权尚未最终确认，对外商用或分发数据前，运营方须另行确认授权。",
  },
  {
    title: "错误监控",
    content: "为排查稳定性问题，前端会记录页面运行错误并上报服务器，错误信息不包含自选股、持仓明细等敏感业务数据。",
  },
  {
    title: "Cookie 与本地存储",
    content: "网站会使用浏览器本地存储保存登录凭证、自选同步缓存、复盘状态和访问统计标记。你可以随时清理浏览器站点数据，清理后游客数据只能通过当前登录状态继续访问。",
  },
  {
    title: "未成年人保护",
    content: "本服务面向具备相应风险承受能力的成年用户。如你未满 18 周岁，请在监护人指导下使用，并在监护人同意后提供任何信息。",
  },
  {
    title: "你的权利",
    content: "你可以清理页面缓存，删除自选、计划、持仓与交易记录，也可以通过“意见反馈”申请删除服务器同步数据或解绑手机号。",
  },
  {
    title: "政策更新",
    content: "我们可能不定期更新本政策，更新后会在本页面公布并更新日期。继续使用本站视为接受更新后的政策。",
  },
];

export default function PrivacyPage() {
  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <section className="neo-fade-up">
          <h1 className="text-xl font-bold text-neo-ink">隐私政策</h1>
          <p className="mt-2 text-sm text-neo-mid">更新日期：2026 年 8 月 8 日</p>
        </section>

        <section className="mt-6 space-y-4">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className="neo-card p-5 neo-fade-up"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <h2 className="text-sm font-semibold text-neo-ink">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-neo-mid">{section.content}</p>
            </article>
          ))}
        </section>

        <section className="neo-card neo-fade-up mt-6 p-5" style={{ animationDelay: "720ms" }}>
          <h2 className="text-sm font-semibold text-neo-ink">应用与备案信息</h2>
          <div className="mt-3 space-y-2 text-sm text-neo-mid">
            <p>应用名称：爱看盘</p>
            <p>网站名称：每日复盘</p>
            <p>网站域名：aikanpan.top</p>
            <p>ICP 备案：渝ICP备2026014729号-1（已备案）</p>
          </div>
        </section>

        <section className="neo-fade-up mt-6" style={{ animationDelay: "780ms" }}>
          <p className="text-xs leading-relaxed text-neo-dim">
            本站数据仅供参考，不构成投资建议。投资有风险，入市需谨慎。
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
