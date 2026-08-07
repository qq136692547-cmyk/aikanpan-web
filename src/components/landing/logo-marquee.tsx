"use client";

const LOGOS = [
  "上海证券交易所",
  "深圳证券交易所",
  "北京证券交易所",
  "中信证券",
  "华泰证券",
  "国泰君安",
  "海通证券",
  "招商证券",
  "东方财富",
  "同花顺",
  " Wind 资讯",
  "通达信",
];

export function LogoMarquee() {
  return (
    <div className="relative overflow-hidden py-8">
      {/* 边缘遮罩 */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[var(--void)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[var(--void)] to-transparent" />

      {/* 滚动轨道 */}
      <div className="flex animate-[marquee_30s_linear_infinite] items-center gap-12 whitespace-nowrap">
        {[...LOGOS, ...LOGOS].map((name, i) => (
          <span
            key={i}
            className="text-[15px] font-medium tracking-wide text-[var(--ink-dim)] opacity-60 transition-opacity hover:opacity-100"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
