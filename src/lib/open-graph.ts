import type { Metadata } from "next";

/**
 * 全站默认 og 图。
 *
 * 根 layout 用的是同一个文件，但**页面级 openGraph 会整体替换父级**，所以任何页面
 * 只要自己写了 openGraph，就必须把这张图一起写回来，否则该页会丢掉 og:image。
 */
const DEFAULT_OG_IMAGE = {
  url: "/og-cover.png",
  width: 1200,
  height: 630,
  alt: "爱看盘 · A股/港股/美股 AI 复盘工作台",
};

type OpenGraphInput = {
  /** og:title，写**完整标题**（og 不吃 title 的 "%s · 爱看盘" 模板，这里要自带品牌） */
  title: string;
  /** og:description，通常与页面 description 同文 */
  description: string;
  /** 该页自身路径（带尾斜杠），如 "/market/"；动态页传具体路径 */
  url: string;
  /** 需要自定义图片替代文案时传 */
  imageAlt?: string;
};

/**
 * 生成**完整**的 openGraph 对象（title / description / url / siteName / locale / type / images）。
 *
 * 为什么要有这个函数：Next 的 metadata 合并规则是「页面级 openGraph 整体替换父级、
 * 不做深合并」（见 next/dist/lib/metadata/resolve-metadata.js 里
 * `newResolvedMetadata.openGraph = resolveOpenGraph(...)`），所以只要某页写了
 * `openGraph: { url }`，根 layout 的 og:image、og:site_name、og:locale 会一起消失。
 * 之前全站 og:url 都指首页的根因也在这里：除首页外没人写过 openGraph。
 *
 * 统一走这个构造器，逐页就不用手抄 images/siteName/locale，漏字段的概率为 0。
 */
export function buildOpenGraph({
  title,
  description,
  url,
  imageAlt,
}: OpenGraphInput): Metadata["openGraph"] {
  return {
    title,
    description,
    url,
    siteName: "爱看盘",
    locale: "zh_CN",
    type: "website",
    images: [
      {
        ...DEFAULT_OG_IMAGE,
        ...(imageAlt ? { alt: imageAlt } : null),
      },
    ],
  };
}
