export const INDEXABLE_STOCKS = [
  { code: "sh600519", name: "贵州茅台" },
  { code: "sz300750", name: "宁德时代" },
  { code: "sz002594", name: "比亚迪" },
  { code: "sh601318", name: "中国平安" },
  { code: "sh600036", name: "招商银行" },
  { code: "sh600900", name: "长江电力" },
  { code: "sh601899", name: "紫金矿业" },
  { code: "sh600030", name: "中信证券" },
  { code: "sh601012", name: "隆基绿能" },
  { code: "sh600276", name: "恒瑞医药" },
  { code: "sh600887", name: "伊利股份" },
  { code: "sh601088", name: "中国神华" },
  { code: "sh600309", name: "万华化学" },
  { code: "sh601166", name: "兴业银行" },
  { code: "sh601857", name: "中国石油" },
  { code: "sh600028", name: "中国石化" },
  { code: "sh601398", name: "工商银行" },
  { code: "sh601288", name: "农业银行" },
  { code: "sh601939", name: "建设银行" },
  { code: "sh601988", name: "中国银行" },
  { code: "sh600050", name: "中国联通" },
  { code: "sh601668", name: "中国建筑" },
  { code: "sz000001", name: "平安银行" },
  { code: "sz000002", name: "万科A" },
  { code: "sz000333", name: "美的集团" },
  { code: "sz000651", name: "格力电器" },
  { code: "sz000858", name: "五粮液" },
  { code: "sz002415", name: "海康威视" },
  { code: "sz002475", name: "立讯精密" },
  { code: "sz300059", name: "东方财富" },
  { code: "sz300124", name: "汇川技术" },
  { code: "sz002714", name: "牧原股份" },
  { code: "sz000725", name: "京东方A" },
  { code: "sz002230", name: "科大讯飞" },
  { code: "sz300274", name: "阳光电源" },
  { code: "sz300760", name: "迈瑞医疗" },
  { code: "sz300308", name: "中际旭创" },
  { code: "sh600176", name: "中国巨石" },
  { code: "sh600487", name: "亨通光电" },
  { code: "sh603986", name: "兆易创新" },
  { code: "sz300502", name: "新易盛" },
  { code: "sh600183", name: "生益科技" },
  { code: "sh600584", name: "长电科技" },
  { code: "sh688256", name: "寒武纪" },
  { code: "sh600522", name: "中天科技" },
  { code: "sz002384", name: "东山精密" },
  { code: "sh688008", name: "澜起科技" },
  { code: "sz002185", name: "华天科技" },
  { code: "sz002156", name: "通富微电" },
  { code: "sz002281", name: "光迅科技" },
  { code: "sz002463", name: "沪电股份" },
  { code: "sh688041", name: "海光信息" },
  { code: "sh688012", name: "中微公司" },
  { code: "sh688521", name: "芯原股份" },
  { code: "sz300476", name: "胜宏科技" },
  { code: "sz300604", name: "长川科技" },
  { code: "sz002371", name: "北方华创" },
  { code: "sh601138", name: "工业富联" },
  { code: "sz000988", name: "华工科技" },
  { code: "sh688347", name: "华虹宏力" },
  { code: "sz300408", name: "三环集团" },
  { code: "sh601872", name: "招商轮船" },
  { code: "sz000938", name: "紫光股份" },
  { code: "sh688981", name: "中芯国际" },
  { code: "sz000977", name: "浪潮信息" },
  { code: "sh600150", name: "中国船舶" },
  { code: "sh688072", name: "拓荆科技" },
  { code: "sh688361", name: "中科飞测" },
  { code: "sz001309", name: "德明利" },
  { code: "sh600498", name: "烽火通信" },
  { code: "sz300223", name: "君正股份" },
  { code: "sh603259", name: "药明康德" },
  { code: "AAPL", name: "苹果" },
  { code: "NVDA", name: "英伟达" },
  { code: "MSFT", name: "微软" },
  { code: "00700", name: "腾讯控股" },
  { code: "09988", name: "阿里巴巴-W" },
  { code: "03690", name: "美团-W" },
  { code: "01810", name: "小米集团-W" },
  { code: "00941", name: "中国移动" },
  { code: "00005", name: "汇丰控股" },
  { code: "02318", name: "中国平安" },
  { code: "00388", name: "香港交易所" },
] as const;

export const INDEXABLE_STOCK_CODES = INDEXABLE_STOCKS.map((stock) => stock.code);

const INDEXABLE_STOCK_CODE_SET = new Set<string>(INDEXABLE_STOCK_CODES);

export function canonicalStockCode(raw: string): string {
  const cn = raw.match(/^(sh|sz|bj)\.?(\d{6})$/i);
  if (cn) return `${cn[1].toLowerCase()}${cn[2]}`;
  if (/^\d{1,5}$/.test(raw)) return raw.padStart(5, "0");
  return raw.toUpperCase();
}

export function stockApiCode(routeCode: string): string {
  const cn = routeCode.match(/^(sh|sz|bj)(\d{6})$/i);
  if (cn) return `${cn[1].toLowerCase()}.${cn[2]}`;
  return routeCode.toUpperCase();
}

export function stockDisplayCode(routeCode: string): string {
  const cn = routeCode.match(/^(sh|sz|bj)(\d{6})$/i);
  return cn ? cn[2] : routeCode.toUpperCase();
}

export function isUsStockCode(routeCode: string): boolean {
  return !/^(sh|sz|bj)(\d{6})$/i.test(routeCode)
    && !/^\d{4,5}$/.test(routeCode)
    && /^[A-Z][A-Z0-9.-]{0,9}$/.test(routeCode);
}

export function isHkStockCode(routeCode: string): boolean {
  return /^\d{4,5}$/.test(routeCode);
}

export function isIndexableStockCode(raw: string): boolean {
  return INDEXABLE_STOCK_CODE_SET.has(canonicalStockCode(raw));
}
