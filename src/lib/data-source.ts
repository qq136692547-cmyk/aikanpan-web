/**
 * 爱看盘 — 数据源名称中性化工具（F7）
 *
 * 后端 `quote.source` 返回的是内部代号（例如若干第三方行情源的缩写、
 * 历史数据标记、网页抓取标记、"不可用" 标记等）。直接展示会给用户暴露
 * 无意义的内部标识，也涉及具体数据源的商标名。
 *
 * 这里统一映射为用户可读的中性表述：具体数据源名称只在隐私政策 / 服务条款
 * 等合规披露页面中列举，前端展示层不再出现商标名。
 *
 * 分类原则：只做「能得到后端语义支持」的区分（历史 / 公开接口 / 不可用），
 * 其余一律归入中性兜底；不臆造「主源 / 备源」等无法证实的承诺，
 * 也不使用「官方数据源」这类会暗示授权的措辞。
 */

/** 实时行情源统一使用的中性名称 */
export const NEUTRAL_QUOTE_SOURCE = "第三方行情源";

/** 把后端 source 内部代号映射为面向用户的中性名称 */
export function friendlyDataSource(source?: string | null): string {
  const key = (source ?? "").trim().toLowerCase();
  switch (key) {
    case "unavailable":
      return "行情数据不可用";
    case "history":
      return "历史行情数据";
    case "web":
      return "公开数据接口";
    default:
      // 含空值在内：其余均为实时行情源的内部代号，一律中性兜底，
      // 绝不把后端内部代码直接透给用户。
      return NEUTRAL_QUOTE_SOURCE;
  }
}
