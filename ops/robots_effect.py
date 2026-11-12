#!/usr/bin/env python3
"""robots 改造生效判定：读 daily 归档，按约定阈值出结论。

## 为什么单独一个脚本

`seo_status.py` 只负责「采集」（每天落一份 daily/YYYY-MM-DD.json），
判定逻辑会随观测窗口变化而调整（7 天看前置、10 天看结果），
混在一起会让采集逻辑跟着判定改动而动摇。所以采集归采集，判定归判定。

## 输入

`/var/lib/aikanpan-seo/daily/YYYY-MM-DD.json`（由 seo_status.py 生成）。
字段依赖：date / counts / hubs / bursts / content_urls / filter。

## 判定规则（2026-11-12 与主理人约定的口径，改之前先对齐）

常量：
- `ROBOTS_DEPLOY_AT`：T0，线上 robots.txt 真的出现新规则的时刻（UTC）
- `L0`：D0 当天首页 index,follow 的个股链接数（改前 5；第 2 周加 chips 后 15）
- 基线 `static_share = 29/49 = 59%`

判据只有一个：**static_share 有没有从 59% 掉到 20% 以下**。
不要用「出现了某种 burst 形状」判断 —— 改前 8 个 burst 里已有 4 个是
「只抓首页」（50%），那是常态，不是失败信号。

分档：
1. 未满 7 天：只看 robots_seen（前置条件）
2. 满 7 天未满 10 天：robots_seen + static_share 初判，标注「窗口未满」
3. 满 10 天：全量判定
任何一档命中确定结论就提前结束，不必等满。

## 用法

    ROBOTS_DEPLOY_AT="2026-11-12T03:20:00Z" python3 ops/robots_effect.py
    ROBOTS_DEPLOY_AT=... L0=5 python3 ops/robots_effect.py --json
"""

import glob
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

DAILY_DIR = os.getenv("SEO_DAILY_DIR", "/var/lib/aikanpan-seo/daily")

# T0：线上 robots.txt 出现新规则的时刻。空值 = 还没部署，直接判「未开始观测」。
ROBOTS_DEPLOY_AT = os.getenv("ROBOTS_DEPLOY_AT", "").strip()
# 首页可收录个股链接数，由增长团在 D0 实测后填，不口头传。
L0 = int(os.getenv("L0", "5"))

WINDOW_DAYS = 10          # 完整观测窗口
EARLY_DAYS = 7            # 前置检查点
STATIC_SHARE_TARGET = 0.20
BASELINE_STATIC_SHARE = 29.0 / 49.0   # 0.5918
MIN_REQS = 10             # 样本太少不下结论

CST = timedelta(hours=8)

# 判定窗口的第一天 = T0 次日的 00:00（北京时间）。
#
# 为什么必须跳过 T0 当天：T0 是 2026-11-12 10:01，而 daily/2026-11-12.json 是
# **全天聚合** —— 里面混了规则生效前的 8 小时和生效后的 14 小时，无法拆分。
# 若把它当成观测第 1 天，等于把「改造前」的数据算进了窗口，判定会被稀释。
# 所以 11-12 只留档、不进判定，窗口从 11-13 00:00 起算。
# 这里硬编码是刻意的：换一次 T0 就要回来改一次，避免默认行为悄悄变。
EXCLUDE_FROM_JUDGMENT = ("2026-11-12",)


def parse_t0():
    """解析 T0。必须兼容 Python 3.6：线上是 3.6.8，没有 `datetime.fromisoformat`（3.7+）。"""
    text = ROBOTS_DEPLOY_AT.strip()
    if not text:
        return None
    # 归一化时区写法：Z -> +0000，+08:00 -> +0800（%z 在 3.6 只吃紧凑写法）。
    # 注意必须先判断「确实带时区」再剥冒号：无时区的 ...T02:01:28 末尾也是 :28，
    # 无脑剥会把秒切掉（这个坑第一次写就踩了）。
    text = text.replace("Z", "+0000").replace("z", "+0000")
    if re.search(r"[+-]\d{2}:\d{2}$", text):
        text = text[:-3] + text[-2:]
    moment = None
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            moment = datetime.strptime(text, fmt)
            break
        except ValueError:
            moment = None
    if moment is None:
        return None
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(timezone.utc)


def load_days():
    days = []
    for path in sorted(glob.glob(os.path.join(DAILY_DIR, "*.json"))):
        try:
            with open(path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except (OSError, ValueError):
            continue
        if not isinstance(payload.get("date"), str):
            continue
        days.append(payload)
    return days


def aggregate(days):
    counts = {"total": 0, "home": 0, "static": 0, "content": 0, "other": 0}
    # 预置 hub 键，窗口内没有数据时输出也不会是空串（空行看起来像 bug）
    hubs = dict((path, 0) for path in ("/stocks/", "/review/", "/market/", "/sitemap.xml", "/robots.txt"))
    bursts = {"count": 0, "home_only": 0, "static_only": 0, "home_static": 0, "other": 0}
    urls = {}
    rows = []
    for day in days:
        day_counts = day.get("counts") or {}
        for key in counts:
            counts[key] += int(day_counts.get(key) or 0)
        for key, value in (day.get("hubs") or {}).items():
            hubs[key] = hubs.get(key, 0) + int(value or 0)
        for key in bursts:
            bursts[key] += int((day.get("bursts") or {}).get(key) or 0)
        for item in day.get("content_urls") or []:
            url = item.get("url")
            if not url:
                continue
            if url not in urls:
                urls[url] = {"url": url, "kind": item.get("kind"), "hits": 0}
            urls[url]["hits"] += int(item.get("hits") or 1)
        rows.append(
            {
                "date": day.get("date"),
                "reqs": int(day_counts.get("total") or 0),
                "static": int(day_counts.get("static") or 0),
                "content": int(day_counts.get("content") or 0),
                "robots": int((day.get("hubs") or {}).get("/robots.txt") or 0),
                "warning": day.get("rdns_warning"),
            }
        )
    return counts, hubs, bursts, urls, rows


def judge(counts, hubs, urls, elapsed_days):
    """返回 (verdict_code, 结论一句话, 下一步动作)。"""
    reqs = counts["total"]
    static = counts["static"]
    content = counts["content"]
    robots_seen = hubs.get("/robots.txt", 0) > 0
    static_share = (float(static) / reqs) if reqs else None

    if reqs < MIN_REQS:
        return (
            "insufficient",
            "样本不足：窗口内真实百度请求只有 %d 次（< %d），不下结论" % (reqs, MIN_REQS),
            "继续积累；检查 daily 归档是否在正常写入（rdns_warning 是否为 null）",
        )

    if not robots_seen:
        return (
            "robots-not-read",
            "百度还没读取 robots.txt —— 这不是「robots 无效」，是还没来读规则",
            "去资源平台对 https://aikanpan.top/robots.txt 做一次抓取诊断，强制它来读；不要据此下无效结论",
        )

    if elapsed_days < EARLY_DAYS:
        return (
            "early-wait",
            "前置条件已满足（robots.txt 已被读取），距满 7 天还有 %d 天" % (EARLY_DAYS - elapsed_days),
            "等；此阶段不看 content 指标",
        )

    if static == 0 and content == 0 and not any(
        hubs.get(path, 0) > 0 for path in ("/stocks/", "/review/", "/sitemap.xml")
    ):
        # 顺序要紧：这一档必须排在「static_share 达标」之前。
        # 静态归零本身是「占比达标」，但内容页 0 且没有任何新 URI，
        # 说明省下来的配额没有转化成第二跳 —— 那不是 robots 生效，是它干脆不抓了。
        return (
            "ineffective",
            "静态归零、内容页仍 0、也没有任何新 URI —— 规则读到了但没带来第二跳",
            "判 rules 无效，归因到站点权重；转内容质量与抓取诊断，不再改抓取层代码",
        )

    if static_share is not None and static_share < STATIC_SHARE_TARGET:
        if content > 0 or any(hubs.get(path, 0) > 0 for path in ("/stocks/", "/review/", "/sitemap.xml")):
            return (
                "effective",
                "robots 生效：静态占比 %.1f%%（基线 59%%），且已越过第一跳" % (static_share * 100),
                "转为观察收录：看 N1 索引量与 N3 抓取 URL 数的比值",
            )
        return (
            "effective-no-jump",
            "robots 生效：静态占比降到 %.1f%%，但内容页仍为 0" % (static_share * 100),
            "配额已释放但没转化 → 瓶颈在站点权重/内容质量，转内容侧，不再在 robots 上投入",
        )

    return (
        "read-but-ignored",
        "读了规则但静态仍占 %.1f%% —— 它读了不遵守，或读的是搜索引擎云端缓存" % ((static_share or 0) * 100),
        "不要查 Caddy（robots.txt 是 Cache-Control: no-cache, no-store + ETag，源站无缓存）；"
        "直接判 rules 无效，归因站点权重",
    )


def main():
    as_json = "--json" in sys.argv
    t0 = parse_t0()
    if t0 is None:
        message = {
            "status": "not-started",
            "reason": "ROBOTS_DEPLOY_AT 未设置或格式不合法（要 ISO8601，如 2026-11-12T03:20:00Z）",
            "action": "等 robots.txt 真的上线后再设 T0；在那之前任何「无效」结论都不成立",
        }
        print(json.dumps(message, ensure_ascii=False, indent=2) if as_json else
              "[not-started] " + message["reason"] + "\n  → " + message["action"])
        return 0

    now = datetime.now(timezone.utc)
    # 判定窗口从 T0 次日 00:00（北京）起算；T0 当天数据混算，单列不外推。
    t0_cst = t0 + CST
    window_start_day = (t0_cst + timedelta(days=1)).strftime("%Y-%m-%d")
    excluded = set(EXCLUDE_FROM_JUDGMENT) | set([t0_cst.strftime("%Y-%m-%d")])
    window_start_at = (t0_cst + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    elapsed_days = max(0, int((now - window_start_at).total_seconds() // 86400))
    all_days = load_days()
    days = [day for day in all_days if day["date"] >= window_start_day and day["date"] not in excluded]
    t0_day = t0_cst.strftime("%Y-%m-%d")
    excluded_hit = [d for d in all_days if d["date"] in excluded]
    pre_window = [d for d in all_days if d["date"] < window_start_day and d["date"] not in excluded]
    counts, hubs, bursts, urls, rows = aggregate(days)
    verdict, reason, action = judge(counts, hubs, urls, elapsed_days)
    reqs = counts["total"]
    static_share = (float(counts["static"]) / reqs) if reqs else None

    payload = {
        "t0": t0.isoformat(),
        "checked_at": now.replace(microsecond=0).isoformat(),
        "elapsed_days": elapsed_days,
        "window_days": WINDOW_DAYS,
        "judgment_window": {
            "start": window_start_day,
            "excluded": sorted(excluded),
            "excluded_hit": [d["date"] for d in excluded_hit],
            "pre_window_days": [d["date"] for d in pre_window],
        },
        "days_covered": [row["date"] for row in rows],
        "counts": counts,
        "static_share": None if static_share is None else round(static_share, 4),
        "baseline_static_share": round(BASELINE_STATIC_SHARE, 4),
        "hubs": hubs,
        "robots_seen": hubs.get("/robots.txt", 0) > 0,
        "bursts": bursts,
        "L0": L0,
        "content_urls_distinct": len(urls),
        "verdict": verdict,
        "reason": reason,
        "action": action,
    }

    if as_json:
        print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))
        return 0

    print("=== ROBOTS 生效判定 ===")
    print("T0            : %s（已过 %d 天 / 窗口 %d 天）" % (t0.isoformat(), elapsed_days, WINDOW_DAYS))
    print("覆盖日期      : %s" % (", ".join(payload["days_covered"]) or "（无）"))
    if excluded_hit:
        print("排除日期      : %s（T0 当日混算，不计入判定）" % ", ".join(d["date"] for d in excluded_hit))
    if pre_window:
        print("窗口前留档    : %d 天（%s ~ %s），不进判定"
              % (len(pre_window), pre_window[0]["date"], pre_window[-1]["date"]))
    print("判定窗口      : %s 00:00 起（北京），窗口 %d 天" % (window_start_day, WINDOW_DAYS))
    print("请求          : total=%d home=%d static=%d content=%d other=%d"
          % (counts["total"], counts["home"], counts["static"], counts["content"], counts["other"]))
    if static_share is None:
        print("静态占比      : 无样本")
    else:
        print("静态占比      : %.1f%%（基线 %.1f%%，目标 <%.0f%%）"
              % (static_share * 100, BASELINE_STATIC_SHARE * 100, STATIC_SHARE_TARGET * 100))
    print("robots_seen   : %s（/robots.txt 命中 %d 次）" % (payload["robots_seen"], hubs.get("/robots.txt", 0)))
    print("hubs          : " + " ".join("%s=%d" % (k, v) for k, v in sorted(hubs.items())))
    print("bursts        : " + " ".join("%s=%d" % (k, v) for k, v in bursts.items()))
    print("内容页去重    : %d 条（L0=%d）" % (len(urls), L0))
    if urls:
        for url in sorted(urls):
            print("    %s kind=%s hits=%d" % (url, urls[url]["kind"], urls[url]["hits"]))
    print("")
    print("结论          : [%s] %s" % (verdict, reason))
    print("下一步        : %s" % action)
    warned = [row["date"] for row in rows if row["warning"]]
    if warned:
        print("警告          : 这些日期的 rDNS 全失败，计数不可信 -> %s" % ", ".join(warned))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
