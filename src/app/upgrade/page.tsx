import type { Metadata } from "next";
import { buildOpenGraph } from "@/lib/open-graph";
import Link from "next/link";
import { CheckCircle2, Crown, HelpCircle, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { UpgradeExposure } from "./upgrade-exposure";
import { UpgradePayStatus } from "./upgrade-pay-status";
import { MembershipStatus } from "./membership-status";
import { PlanPrice } from "./plan-price";
import { PlanCta } from "./plan-cta";
import { RecoverPanel } from "./recover-panel";

export const metadata: Metadata = {
  title: "升级 Pro",
  description: "爱看盘 Pro 时长卡：跨设备研究记录、AI 复盘与研究流程。",
  robots: { index: false, follow: true },
  alternates: { canonical: "/upgrade/" },
  openGraph: buildOpenGraph({
    title: "升级 Pro · 爱看盘",
    description: "爱看盘 Pro 时长卡：跨设备研究记录、AI 复盘与研究流程。",
    url: "/upgrade/",
  }),
};

/**
 * 付费页内容分层（2026-10-26 重做，方案 C）。
 *
 * 2026-10-09 的 P0-0 用整页 ssr:false 把价格挡出了 SSR，代价是整页所有内容
 * 都不在 HTML 里：首屏只有 21 个可见字符（其中 12 个还是底部导航），
 * 备案号 / 无资质声明 / 客服信息在 HTML 里出现 0 次（首页各 2 次），
 * 慢网 4G 的 LCP 2,988ms（首页 692ms）。
 *
 * 现在按内容性质切分，而不是整页切断：
 *   - 服务端（本文件）：页面骨架、档位名称、权益列表、服务说明、售后流程、
 *     找回与激活说明、免责声明、备案与联系方式、导航与页脚。
 *   - 客户端（子组件岛）：价格数字（plan-price）、支付按钮（plan-cta）、
 *     会员状态（membership-status）、到账确认轮询（upgrade-pay-status）、
 *     找回/激活表单（recover-panel）、曝光埋点（upgrade-exposure）。
 *
 * ⚠️ 本文件里不要再出现任何价格数字（¥xx）。要显示价格就放进 PlanPrice。
 *
 * ⚠️ 配色口径（B5 定性结论，2026-10-27）：本页刻意使用 Tailwind 调色板，**不是 neo 配色残留**。
 *   amber = 主推季卡与主 CTA、purple = 年卡、neutral = 月卡与正文、emerald = 信任/成功、
 *   rose = 错误、blue = 月卡档勾选与找回表单（蓝色在全站还兼作美股标识色）。实测 57 个调色板类在线上
 *   CSS 中 57 条规则齐全，且全目录无硬编码色值。**请勿在没有设计稿的情况下"统一"成 neo 紫** ——
 *   那会抹掉档位层次，而档位层次正是这个页面唯一的转化抓手。
 */

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{
    pay_success?: string | string[];
    out_trade_no?: string | string[];
  }>;
}) {
  const params = await searchParams;
  // P0-4: 支付宝回跳会自带 out_trade_no，与我们 return_url 里的重复，
  // Next.js App Router 对重复 key 解析为 string[]。若数组被透传进
  // order-status 请求 URL 会被逗号拼成 "X,X"，后端查无此单必 404。
  // 这里统一取最后一个值归一化为 string（重复时两值相同，取哪个都对）。
  const lastValue = (v: string | string[] | undefined): string =>
    Array.isArray(v) ? (v[v.length - 1] ?? "") : (v ?? "");
  const paySuccess = lastValue(params.pay_success) === "1";
  const outTradeNo = lastValue(params.out_trade_no);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <Navbar />
      <UpgradeExposure />

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <UpgradePayStatus paySuccess={paySuccess} outTradeNo={outTradeNo} />

        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-400">
            <Crown className="h-3.5 w-3.5" /> 软件增值量化分析权限
          </span>
          <h1 className="mt-3.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            升级爱看盘 Pro 会员
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-neutral-400 sm:text-sm">
            连续使用三地市场 AI 复盘、个股诊断、批量评分与持仓研究
          </p>

          {/* 站点可信信息：决策当场可见（备案可核验 / 资质边界 / 真人客服） */}
          <div className="mx-auto mt-3.5 flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-neutral-400">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition hover:text-neutral-200"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              渝ICP备2026014729号-1 · 工信部官网可核验
            </a>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-neutral-500" />
              无证券投资咨询资格 · 仅提供行情数据与统计研究
            </span>
            <span className="inline-flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-neutral-500" />
              真人客服：微信 denglio0
            </span>
          </div>
        </div>

        <MembershipStatus />

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              支付宝付款后自动开通，所有时长卡权益一致
            </p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-300">
              支付宝扫码付款后系统自动开通会员权益并同时发放恢复码，不自动续费、不自动扣款。购买前请先绑定邮箱或手机号。
            </p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-300">
              开通保障：若付款后会员权益未自动点亮，可先用付款成功页显示的恢复码在上方自助找回；仍无法开通的，请通过微信
              denglio0 或邮箱 qq136692547@gmail.com 提供订单号，我们会核实订单与权益状态后处理。售后条款见
              <Link href="/terms/" className="text-neutral-300 underline hover:text-white">
                《用户协议》售后章节
              </Link>
              。
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-400">
              服务边界：行情数据取自第三方公开接口，可能存在延迟或缺失；AI 内容由大语言模型生成，可能存在错误。本站不提供买卖建议、不承诺收益，据此操作盈亏自负。
            </p>
          </div>
        </div>

        {/* 定价卡片 */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* 季卡（C 位主推） */}
          <div className="relative flex flex-col justify-between rounded-2xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-950/20 to-neutral-900/80 p-5 shadow-xl shadow-amber-500/5 sm:col-span-2 sm:mx-auto sm:w-full sm:max-w-2xl">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-0.5 text-[10px] font-bold tracking-wide text-black uppercase shadow">
              推荐方案
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-base font-bold text-white">
                  <Crown className="h-4 w-4 text-amber-400" />
                  季卡 Pro 会员
                </h2>
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                  立省 8 元
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <PlanPrice plan="quarterly" />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-neutral-300">
                90 天连续使用，适合连续三个月的复盘与盯盘。
              </p>
              <ul className="mt-4 space-y-2 text-xs font-medium text-neutral-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>AI 复盘、个股诊断与批量评分</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>自然语言盯盘提醒与触发记录</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>持仓研究与研究记录</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 border-t border-amber-500/20 pt-4">
              <PlanCta plan="quarterly" />
            </div>
          </div>

          {/* 更多方案：月卡 / 年度时长方案（折叠，原生 details 不需要 JS） */}
          <details className="rounded-2xl border border-neutral-800 bg-neutral-900/40 sm:col-span-2">
            <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-neutral-300 transition select-none hover:text-white">
              更多方案（30 天 / 365 天）
            </summary>
            <div className="grid grid-cols-1 gap-5 px-5 pb-5 sm:grid-cols-2">
              {/* 更多方案 #1：月卡 */}
              <div className="relative flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-sm transition hover:border-neutral-700">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">月卡</h2>
                    <span className="text-xs text-neutral-400">30 天标准版</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <PlanPrice plan="monthly" />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                    适合按月使用 AI 复盘、个股诊断与盯盘提醒。
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-neutral-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                      <span>包含 Pro 全部 AI 分析权益</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                      <span>自然语言盯盘提醒</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                      <span>个股研究笔记与跟踪看板</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 border-t border-neutral-800/80 pt-4">
                  <PlanCta plan="monthly" />
                </div>
              </div>

              {/* 更多方案 #2：年度时长方案（3 笔季卡累计） */}
              <div className="relative flex flex-col justify-between rounded-2xl border border-purple-500/40 bg-gradient-to-b from-purple-950/20 to-neutral-900/60 p-5 shadow-sm transition hover:border-purple-500/60">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-1.5 text-base font-bold text-white">
                      <Crown className="h-4 w-4 text-purple-400" />
                      年度时长方案
                    </h2>
                    <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                      累计 365 天
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <PlanPrice plan="annual" />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                    48 小时内完成 3 笔季卡支付，系统自动补赠 95 天，累计 365 天，无其他费用。
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-neutral-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-purple-400" />
                      <span>365 天 Pro 权益，均不自动续费</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-purple-400" />
                      <span>3 笔季卡支付后自动合并时长</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 border-t border-neutral-800/80 pt-4">
                  <PlanCta plan="annual" />
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* 售后入口 */}
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="flex items-start gap-2">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
            <div className="text-xs leading-relaxed text-neutral-400">
              <p className="font-semibold text-neutral-300">付款后有问题怎么办？</p>
              <p className="mt-1">
                ① 权益未自动点亮：先在下方「换电脑/重装系统自助找回」里输入恢复码自助恢复；
              </p>
              <p className="mt-1">
                ② 恢复码丢失或仍无法开通：请通过微信 denglio0 或邮箱 qq136692547@gmail.com 提供支付宝商户订单号，我们会核实订单与权益状态后处理，详见
                <Link href="/terms/" className="text-neutral-300 underline hover:text-white">
                  《用户协议》售后章节
                </Link>
                。
              </p>
            </div>
          </div>
        </div>

        <RecoverPanel />

        {/* 底部免责声明 */}
        <div className="mt-8 rounded-lg border border-neutral-800/80 p-4 text-center text-xs text-neutral-400">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-neutral-400" />
            服务说明：爱看盘为行情数据与研究辅助工具软件，不提供任何投资收益保证，请自主决策。
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
