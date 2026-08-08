import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "用户协议",
  description: "爱看盘网站用户协议，说明服务内容、账号数据、AI 内容、数据授权与免责声明。",
};

const sections = [
  {
    title: "服务说明",
    content: "爱看盘提供 A 股行情展示、AI 复盘、个股诊断、自选与持仓记录、价格提醒等工具功能。服务可能随时调整或暂停，我们会通过网站公告等方式告知。",
  },
  {
    title: "账号与数据",
    content: "首次访问会自动创建游客账号，自选股、计划、持仓、复盘笔记等数据会同步至服务器（https://aikanpan.top/api/v1）。绑定手机号后可用于跨设备登录与恢复；未绑定手机号时，只能通过当前设备的登录状态访问。",
  },
  {
    title: "AI 内容",
    content: "AI 生成的内容由程序自动产生，仅供信息参考，不构成投资建议。市场有风险，请基于自身判断独立决策，并自行承担投资结果。",
  },
  {
    title: "数据来源与授权",
    content: "行情与资讯数据来自东方财富、新浪财经等第三方平台。我们不对数据的准确性、完整性和及时性作任何保证，也不会转售第三方行情数据。部分数据源的商用授权尚未最终确认；对外商用、分发或转授权数据前，运营方须另行取得相应授权。",
  },
  {
    title: "数据使用与留存统计",
    content: "为改进服务，我们会以第一方统计方式记录页面访问和功能使用事件，并使用去标识化访问者标识分析日活、回访和留存。统计不包含账号密码、持仓明细等敏感内容，也不接入第三方广告或统计 SDK。",
  },
  {
    title: "用户义务",
    content: "你承诺不利用本站进行违法活动，不批量抓取、转售或滥用行情数据，不传播虚假信息，不干扰网站正常运行。因违反上述义务导致的损失由你自行承担。",
  },
  {
    title: "知识产权",
    content: "爱看盘网站自身代码以开源形式发布，行情数据、资讯内容等权利归原始平台所有。未经许可，不得对本站功能进行批量抓取或商业转售。",
  },
  {
    title: "免责声明",
    content: "用户使用本站产生的任何投资决策和后果由用户自行承担。因网络、数据源或第三方服务故障导致的延迟、缺失或错误，本站不承担相应责任。",
  },
  {
    title: "合规与备案",
    content: "本站已完成 ICP 备案（浙ICP备2026014729号-2A）。正式对外提供金融服务前，运营方需继续确认数据授权、投顾资质及当地法律法规要求。",
  },
  {
    title: "协议变更",
    content: "我们可能不定期更新本协议，更新后会在本页面公布。继续使用本站视为接受更新后的协议。",
  },
  {
    title: "合规提示",
    content: "本页面为基础合规文档，不替代专业法律意见。正式商用前，建议由法律专业人士根据实际运营情况复核。",
  },
];

export default function TermsPage() {
  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <section className="neo-fade-up">
          <h1 className="text-xl font-bold text-neo-ink">用户协议</h1>
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
      </main>
      <Footer />
    </div>
  );
}
