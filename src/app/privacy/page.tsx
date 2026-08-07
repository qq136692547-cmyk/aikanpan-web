import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "隐私政策",
  description: "爱复盘 HarmonyOS App 与爱看盘网站的隐私政策，说明信息收集、使用、存储与用户权利。",
};

const sections = [
  {
    title: "适用范围",
    content:
      "本政策适用于爱复盘 HarmonyOS 客户端与爱看盘网站，说明我们如何处理与行情浏览、自选管理、复盘笔记、持仓记录、价格提醒和意见反馈相关的信息。",
  },
  {
    title: "我们处理的信息",
    content:
      "我们会处理你主动输入或在本地形成的数据，包括自选股列表、搜索历史、复盘笔记、持仓记录、价格提醒、主题设置，以及你在留言反馈中提交的内容。应用不会读取通讯录、相册、定位、麦克风或相机。",
  },
  {
    title: "华为账号与云端同步",
    content:
      "若你主动绑定华为账号，我们会通过华为账号服务获取用于识别同步账户的 OpenID、UnionID；在你授权资料权限时，还会获取昵称和头像。绑定成功后，自选股、复盘笔记、持仓记录和价格提醒会同步至应用服务端。",
  },
  {
    title: "权限与系统能力",
    content:
      "当前版本仅申请网络访问权限，用于请求行情、复盘和反馈接口。你主动点击复制分享内容时，应用会调用系统剪贴板能力，仅写入当次分享文本，不会在后台持续读取剪贴板。",
  },
  {
    title: "信息使用方式",
    content:
      "上述信息用于提供行情展示、AI 复盘摘要、自选与持仓管理、价格提醒和反馈处理能力。网络请求会发送到应用服务端 https://aikanpan.top/api/v1，用于返回行情数据、AI 解读结果和接收反馈内容。你主动绑定华为账号并确认同步后，相关数据会发送至该服务端用于跨设备同步。",
  },
  {
    title: "本地存储与共享",
    content:
      "自选股、笔记、搜索历史、价格提醒、持仓记录和主题设置默认保存在当前设备本地。除你主动提交反馈、主动绑定华为账号并确认同步外，我们不会共享你的个人内容。当前版本未接入第三方统计或广告 SDK；华为账号服务仅在你主动点击绑定时调用。",
  },
  {
    title: "你的权利",
    content:
      "你可以清理缓存、删除本地保存的数据；也可以在“我的”页面解绑华为账号以停止后续同步，或通过“留言反馈”申请删除服务端同步数据。如对本政策或数据处理有疑问，可通过“留言反馈”入口联系我们。",
  },
];

export default function PrivacyPage() {
  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <section className="neo-fade-up">
          <h1 className="text-xl font-bold text-neo-ink">隐私政策</h1>
          <p className="mt-2 text-sm text-neo-mid">
            更新日期：2026 年 8 月 4 日
          </p>
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

        <section className="neo-card neo-fade-up mt-6 p-5" style={{ animationDelay: "480ms" }}>
          <h2 className="text-sm font-semibold text-neo-ink">应用与备案信息</h2>
          <div className="mt-3 space-y-2 text-sm text-neo-mid">
            <p>应用名称：爱复盘</p>
            <p>App 备案号：渝ICP备2026014729号-2A</p>
          </div>
        </section>

        <section className="neo-fade-up mt-6" style={{ animationDelay: "540ms" }}>
          <p className="text-xs leading-relaxed text-neo-dim">
            本站数据仅供参考，不构成投资建议。投资有风险，入市需谨慎。
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
