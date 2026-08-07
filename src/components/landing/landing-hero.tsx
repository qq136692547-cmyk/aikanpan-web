"use client";

import { useEffect, useRef, useState } from "react";
import { Globe3D } from "@/components/landing/globe-3d";

const easeOutStrong = [0.215, 0.61, 0.355, 1] as const;

function useInView(threshold: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export function LandingHero() {
  const text = useInView(0.35);
  const globe = useInView(0.2);

  return (
    <div className="relative min-h-screen bg-[#08080c] font-inter">
      {/* Hero 背景图 */}
      <img loading="lazy"
        src="/images/ai-art/landing-hero-bg.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
      />
      {/* 暗色叠加层确保文字可读性 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#08080c]/60 via-[#08080c]/70 to-[#08080c]" />

      <header className="fixed top-0 z-50 w-full">
        <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2">
            <span className="h-4 w-4 rounded bg-white" />
            <span className="text-[15px] font-semibold tracking-tight text-white">爱看盘</span>
          </a>
          <a
            href="/dashboard/"
            className="rounded-lg border border-[#2a2a30] bg-black px-4 py-1.5 text-[13px] font-medium text-white transition-all hover:border-[#3a3a44] hover:bg-[#0a0a0e]"
          >
            进入仪表盘 →
          </a>
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-center px-6 pb-8 pt-28 sm:pt-36 md:pt-40 text-center">
        <div
          ref={text.ref}
          className="transition-all duration-1000 will-change-transform"
          style={{
            opacity: text.inView ? 1 : 0,
            transform: text.inView ? "translateY(0)" : "translateY(30px)",
            transitionTimingFunction: `cubic-bezier(${easeOutStrong.join(",")})`,
          }}
        >
          <h1
            className="text-[36px] sm:text-[48px] md:text-[64px] font-bold leading-[1.1] tracking-tight"
          >
            <span className="text-white">让 AI 帮你看懂</span>
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #6C63FF 0%, #8F7BFF 50%, #A79BFF 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              A 股市场
            </span>
          </h1>
          <p className="mx-auto mt-8 text-[14px] sm:text-[16px] md:text-[18px] leading-relaxed text-[#8a8a92]">
            实时行情 · AI 智能诊断 · 每日复盘 · 智能盯盘
            <br />
            一站式 A 股投资决策辅助工具
          </p>
          <div className="mt-10 flex flex-col items-center gap-3">
            <a
              href="/dashboard/"
              className="inline-block rounded-xl bg-[#6C63FF] px-8 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-[#5B52E8] hover:shadow-[0_0_24px_-4px_rgba(108,99,255,0.6)]"
            >
              免费使用 →
            </a>
            <p className="text-[12px] text-white/30">无需注册 · 游客即可访问</p>
          </div>
        </div>
      </section>

      <section className="relative -mt-40 flex h-[800px] items-center justify-center overflow-hidden">
        <div
          ref={globe.ref}
          className="absolute inset-0 pointer-events-none transition-all duration-1000 will-change-transform [transition-delay:150ms]"
          style={{
            opacity: globe.inView ? 1 : 0,
            transform: globe.inView ? "scale(1)" : "scale(0.5)",
            transitionTimingFunction: `cubic-bezier(${easeOutStrong.join(",")})`,
          }}
        >
          <Globe3D />
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-64"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, #08080c 100%)",
          }}
        />
      </section>

      {/* 产品预览大图 */}
      <section className="relative z-10 px-6 py-8">
        <div className="mx-auto max-w-[1200px]">
          <img loading="lazy"
            src="/images/ai-art/landing-product-preview.png"
            alt="爱看盘产品预览"
            className="w-full rounded-2xl border border-[#16161c] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]"
          />
        </div>
      </section>

      <section className="relative z-10 px-6 py-16">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { icon: "📊", title: "实时行情", desc: "三大指数、29 个行业板块、涨跌停实时统计，盘中数据 30 秒刷新" },
            { icon: "🤖", title: "AI 诊断", desc: "输入股票代码，AI 秒出诊断报告：趋势研判、风险提示、资金分析" },
            { icon: "📝", title: "每日复盘", desc: "AI 自动生成每日复盘报告，含市场评分、强势行业、资讯研报" },
            { icon: "🔔", title: "智能盯盘", desc: "自然语言创建盯盘任务，AI 解析条件实时监控，到价自动提醒" },
            { icon: "🔍", title: "快速搜索", desc: "热门股票一键直达，代码搜索跳转个股详情页" },
            { icon: "📈", title: "TradingView", desc: "专业 K 线图，支持日线/周线/月线，技术指标一目了然" },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-[#16161c] bg-[#0c0c12] p-5 transition-colors hover:border-[#22222a]"
            >
              <div className="text-[28px]">{f.icon}</div>
              <h3 className="mt-3 text-[18px] font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#6a6a72]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-6 py-24">
        <div className="mx-auto flex max-w-[1200px] items-center gap-12">
          <div className="flex-1 text-left">
            <h2 className="text-[42px] font-semibold tracking-tight text-white">开始你的 AI 复盘</h2>
            <p className="mt-3 text-[16px] text-[#6a6a72]">免费使用 · 无需注册 · 数据实时</p>
            <a
              href="/dashboard/"
              className="mt-8 inline-block rounded-xl bg-[#6C63FF] px-8 py-3.5 text-[16px] font-semibold text-white transition-all hover:bg-[#5B52E8] hover:shadow-[0_0_24px_-4px_rgba(108,99,255,0.6)]"
            >
              免费使用 →
            </a>
          </div>
          <div className="hidden flex-1 md:block">
            <img loading="lazy"
              src="/images/ai-art/landing-cta-decoration.png"
              alt=""
              aria-hidden
              className="w-full rounded-2xl opacity-80"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
