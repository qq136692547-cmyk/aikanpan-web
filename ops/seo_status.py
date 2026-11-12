#!/usr/bin/env python3
"""Record a small, reliable SEO health snapshot for aikanpan.top.

两件事，互不干扰：
1. status.json —— 8 个关键 URL 的 HTTP 状态 + sitemap 条数 + 百度推送进度（覆盖写）；
2. daily/YYYY-MM-DD.json —— 当天真实 Baiduspider 的抓取分项（按天归档，不覆盖历史）。
   第 2 项存在的理由：Caddy 只留 5 个 gz（约 11~13 天），status.json 每天覆盖写，
   改造前后的抓取结构根本没法对比。字段口径与增长团的 burst 报告对齐。
"""

import glob
import gzip
import json
import os
import subprocess
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone


SITE_URL = os.getenv("SEO_SITE_URL", "https://aikanpan.top").rstrip("/")
BAIDU_STATE = os.getenv(
    "BAIDU_PUSH_STATE", "/var/lib/aikanpan-baidu-push/state.json"
)
STATUS_FILE = os.getenv(
    "SEO_STATUS_FILE", "/var/lib/aikanpan-seo/status.json"
)
USER_AGENT = "aikanpan-seo-status/1.0"

# --- 百度抓取分项统计（2026-11-12 新增） ---------------------------------
#
# 为什么要单独留一份按天归档：
#   1. Caddy 只保留 5 个 gz（实测覆盖约 11~13 天），跨 14 天的对比窗口撑不住；
#   2. status.json 每天整份覆盖写，不留历史，改造前后无法对比。
# 所以这里每天落一份 daily/YYYY-MM-DD.json，只追加不覆盖历史日期。
#
# 判定口径（与增长团 11-12 对齐，别改）：
#   - UA 含 Baiduspider **且** 来源 IP 反查后缀命中 *.crawl.baidu.com；
#   - 排除测试/扫描 IP（默认 3 个，曾被统计成百度）；
#   - URL 命中按带斜杠形式计（/stocks/ 算 hub，/stocks 的 308 单独计）。
BAIDU_UA_TOKEN = "Baiduspider"
BAIDU_RDNS_SUFFIX = os.getenv("BAIDU_RDNS_SUFFIX", ".crawl.baidu.com")
# 单次 rDNS 超时。getent 正常时几毫秒，3s 只兜底 DNS 半死的情况，
# 避免几十个 IP 各卡 8s 把定时任务拖到分钟级。
BAIDU_RDNS_TIMEOUT = float(os.getenv("BAIDU_RDNS_TIMEOUT", "3"))
BAIDU_BLOCKED_IPS = set(
    item.strip()
    for item in os.getenv(
        "BAIDU_BLOCKED_IPS", "113.250.140.81,34.53.173.173,34.6.224.8"
    ).split(",")
    if item.strip()
)
DAILY_DIR = os.getenv("SEO_DAILY_DIR", "/var/lib/aikanpan-seo/daily")
CADDY_ACCESS_LOG = os.getenv("CADDY_ACCESS_LOG", "/var/log/caddy/access.log")
# 扫多少个日志文件。0 = 不限制（全部）。
#
# 2026-11-12 踩过的坑：默认值是 3，结果 13 天回填时漏掉了 11-05 那个文件
#（Caddy 实际保留 6 个，11-05 排在第 5），聚合从 49 掉到 36，看起来像「百度少抓了」。
# 归档脚本的价值就是全量，不能为了省几秒把历史截掉 —— 单文件 100MB、全量扫
# 也就 1~2 秒，比起漏数据完全不值得省。
BAIDU_LOG_MAX_FILES = int(os.getenv("BAIDU_LOG_MAX_FILES", "0"))
BURST_GAP_SECONDS = 60
CST = timedelta(hours=8)

# rDNS 结果跨调用复用：backfill 会扫两天，同一批 IP 重复 getent 是浪费。
_RDNS_CACHE = {}

# 每天重算前 N 天（默认 1 = 昨天）。
#
# 为什么必须：如果定时任务在每天 23:00 跑，当日文件只统计到 23:00，最后 1 小时永远丢；
# 若在次日 00:10 跑，又会用 10 分钟的窗口写次日。所以每次顺带把昨天整份重算一遍，
# 昨天的文件在次日第一次运行时被补全，历史日期只会变得更完整，不会变少。
BAIDU_DAILY_BACKFILL_DAYS = int(os.getenv("BAIDU_DAILY_BACKFILL_DAYS", "1"))

# hub 页：判断「是否越过第一跳」的直接证据，单独计数。
HUB_PATHS = ("/stocks/", "/review/", "/market/", "/sitemap.xml", "/robots.txt")



def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def request(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()
    except Exception as error:
        return 0, str(error).encode("utf-8", errors="replace")


def load_json(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, ValueError):
        return default


def save_json(path, payload):
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, mode=0o700, exist_ok=True)
    descriptor, temporary_path = tempfile.mkstemp(
        prefix=".status-", suffix=".json", dir=directory or "."
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=True, indent=2, sort_keys=True)
            handle.write("\n")
        os.chmod(temporary_path, 0o600)
        os.replace(temporary_path, path)
    finally:
        if os.path.exists(temporary_path):
            os.unlink(temporary_path)


def shanghai_stamp(ts, fmt):
    """Caddy 日志的 `ts` 是 UTC 秒。换算成北京时间再格式化。

    服务器时区不一定是 CST，所以这里写死 +8，不依赖本地时区。
    """
    return (datetime.utcfromtimestamp(ts) + CST).strftime(fmt)


def resolve_rdns(ip, cache=None):
    """反查 PTR，返回主机名；查不到返回空串。

    用 rDNS 而不是 IP 段判断：11-12 实测过一个伪造 Baiduspider UA 的出口
    （113.250.140.81）反查为空，而真实百度抓取反查都是
    `baiduspider-<ip 连字符>.crawl.baidu.com`。
    """
    cache = _RDNS_CACHE if cache is None else cache
    if ip in cache:
        return cache[ip]
    name = ""
    try:
        result = subprocess.run(
            ["getent", "hosts", ip],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            timeout=BAIDU_RDNS_TIMEOUT,
        )
        text = (result.stdout or "").strip()
        if text:
            name = text.split()[-1]
    except Exception:
        name = ""
    cache[ip] = name
    return name


def classify_uri(uri):
    if uri in ("", "/"):
        return "home"
    if uri.startswith("/_next/static/"):
        return "static"
    if uri.startswith(("/stock", "/review", "/market")):
        return "content"
    return "other"


def caddy_log_files():
    """取 Caddy 日志文件列表。

    `BAIDU_LOG_MAX_FILES` > 0 时只取最新 N 个；默认 0 = 全部。
    归档脚本宁慢不漏：漏一个文件就会让某天的数字凭空变小，而它长得像
    「百度少抓了」，是最难排查的那种错。
    """
    found = []
    # Caddy 轮转后的文件名是 `access-<时间戳>.log.gz`，与 `access.log` 同前缀但
    # 不是 `access.log*`，所以按「去掉 .log 后缀的前缀」去 glob。
    stem = CADDY_ACCESS_LOG[:-4] if CADDY_ACCESS_LOG.endswith(".log") else CADDY_ACCESS_LOG
    for path in glob.glob(stem + "*"):
        if not path.endswith((".log", ".gz")):
            continue
        try:
            found.append((os.path.getmtime(path), path))
        except OSError:
            continue
    found.sort(reverse=True)
    if BAIDU_LOG_MAX_FILES > 0:
        found = found[:BAIDU_LOG_MAX_FILES]
    paths = [path for _, path in found]
    if CADDY_ACCESS_LOG not in paths and os.path.exists(CADDY_ACCESS_LOG):
        paths.insert(0, CADDY_ACCESS_LOG)
    return paths


def iter_log_records(paths):
    """逐行产出 JSON 记录；非百度行在 json 解析前就丢掉（省 CPU）。"""
    for path in paths:
        opener = gzip.open if path.endswith(".gz") else open
        try:
            handle = opener(path, "rt", encoding="utf-8", errors="replace")
        except (OSError, ValueError):
            continue
        try:
            for line in handle:
                if BAIDU_UA_TOKEN not in line:
                    continue
                try:
                    yield json.loads(line)
                except ValueError:
                    continue
        finally:
            handle.close()


def collect_baidu_daily(day):
    """统计指定日期（北京时间）真实 Baiduspider 的抓取分项。

    返回结构直接落盘，字段名与增长团的 burst 报告对拍：
      counts  总/首页/静态/内容页
      hubs    /stocks/ /review/ /market/ /sitemap.xml /robots.txt 命中数
      bursts  按 60s 间隔切分的抓取簇（形如「取完首页和静态就结束」）
      content_urls  distinct 内容页 URL 清单
    """
    paths = caddy_log_files()
    rdns_cache = {}
    dropped = {"ua_only": 0, "blocked": 0, "rdns_miss": 0, "other_day": 0}
    counts = {"total": 0, "home": 0, "static": 0, "content": 0, "other": 0}
    hubs = dict((path, 0) for path in HUB_PATHS)
    urls = {}
    stamps = []

    for entry in iter_log_records(paths):
        req = entry.get("request") or {}
        ua = " ".join((req.get("headers") or {}).get("User-Agent") or [])
        if BAIDU_UA_TOKEN not in ua:
            dropped["ua_only"] += 1
            continue
        ip = req.get("remote_ip") or ""
        if ip in BAIDU_BLOCKED_IPS:
            dropped["blocked"] += 1
            continue
        if not resolve_rdns(ip, rdns_cache).endswith(BAIDU_RDNS_SUFFIX):
            dropped["rdns_miss"] += 1
            continue
        ts = entry.get("ts")
        if not isinstance(ts, (int, float)):
            continue
        if shanghai_stamp(ts, "%Y-%m-%d") != day:
            dropped["other_day"] += 1
            continue

        uri = req.get("uri") or ""
        kind = classify_uri(uri)
        counts["total"] += 1
        counts[kind] += 1
        if uri in hubs:
            hubs[uri] += 1
        if kind == "content":
            item = urls.get(uri)
            if item is None:
                urls[uri] = {"url": uri, "kind": kind, "hits": 1, "first": ts, "last": ts}
            else:
                item["hits"] += 1
                item["first"] = min(item["first"], ts)
                item["last"] = max(item["last"], ts)
        stamps.append((ts, kind))

    stamps.sort(key=lambda pair: pair[0])
    bursts = []
    for ts, kind in stamps:
        if bursts and ts - bursts[-1]["last"] <= BURST_GAP_SECONDS:
            bursts[-1]["last"] = ts
            bursts[-1]["kinds"].add(kind)
        else:
            bursts.append({"first": ts, "last": ts, "kinds": set([kind])})
    summary = {
        "count": len(bursts),
        "home_only": 0,
        "static_only": 0,
        "home_static": 0,
        "other": 0,
    }
    for burst in bursts:
        kinds = burst["kinds"]
        if kinds == set(["home"]):
            summary["home_only"] += 1
        elif kinds == set(["static"]):
            summary["static_only"] += 1
        elif kinds == set(["home", "static"]):
            summary["home_static"] += 1
        else:
            summary["other"] += 1

    content_urls = []
    for item in sorted(urls.values(), key=lambda value: value["url"]):
        content_urls.append(
            {
                "url": item["url"],
                "kind": item["kind"],
                "hits": item["hits"],
                "first": shanghai_stamp(item["first"], "%m-%d %H:%M"),
                "last": shanghai_stamp(item["last"], "%m-%d %H:%M"),
            }
        )

    resolved = [name for name in rdns_cache.values() if name]
    rdns_ok = len(resolved)
    # 全空 = getent 不存在 / DNS 不可用。此时 counts 全 0 是「测不出来」，
    # 不是「百度没来抓」，必须显式告诉读报告的人，否则会误判成抓取归零。
    rdns_warning = None
    # 仅当 rDNS 校验处于启用状态（suffix 非空）时才告警；
    # suffix 为空是显式关闭校验（本地调试用），此时不该报「反查失败」。
    if BAIDU_RDNS_SUFFIX and rdns_cache and rdns_ok == 0:
        rdns_warning = (
            "所有 rDNS 反查为空：检查 getent 是否存在、DNS 是否可用。"
            "本文件 counts 不可信，不能据此判断百度没抓。"
        )

    return {
        "date": day,
        "generated_at": now_iso(),
        "window": {"tz": "Asia/Shanghai", "start": day + " 00:00", "end": day + " 23:59"},
        "filter": {
            "ua_token": BAIDU_UA_TOKEN,
            "rdns_suffix": BAIDU_RDNS_SUFFIX,
            "blocked_ips": sorted(BAIDU_BLOCKED_IPS),
            "log_files": [os.path.basename(path) for path in paths],
        },
        "counts": counts,
        "hubs": hubs,
        "bursts": summary,
        "content_urls": content_urls,
        "dropped": dropped,
        "rdns_unique_ips": len(rdns_cache),
        "rdns_names_resolved": rdns_ok,
        "rdns_warning": rdns_warning,
    }


def write_daily(payload):
    """落一份 daily/YYYY-MM-DD.json。同日重跑会覆盖当天，历史日期不动。"""
    path = os.path.join(DAILY_DIR, payload["date"] + ".json")
    save_json(path, payload)
    return path


def main():
    today = datetime.now().strftime("%Y-%m-%d")
    checks = {}
    urls = [
        SITE_URL + "/",
        SITE_URL + "/stocks/",
        SITE_URL + "/market/limit-up/",
        SITE_URL + "/market/fund-flow/",
        SITE_URL + "/market/temperature/",
        SITE_URL + "/review/" + today + "/",
        SITE_URL + "/sitemap.xml",
        SITE_URL + "/robots.txt",
    ]
    for url in urls:
        status, body = request(url)
        checks[url] = {
            "status": status,
            "bytes": len(body),
        }

    sitemap_status, sitemap_body = request(SITE_URL + "/sitemap.xml")
    sitemap_urls = sitemap_body.count(b"<loc>") if sitemap_status == 200 else 0
    baidu_state = load_json(BAIDU_STATE, {})
    submitted = baidu_state.get("submitted") or {}
    last_result = baidu_state.get("last_result") or {}
    pending = max(0, sitemap_urls - len(submitted)) if sitemap_urls else None

    payload = {
        "checked_at": now_iso(),
        "sitemap_urls": sitemap_urls,
        "baidu_submitted": len(submitted),
        "baidu_pending": pending,
        "baidu_last_result": last_result,
        "checks": checks,
        "healthy": all(item["status"] == 200 for item in checks.values()),
    }

    # 百度抓取分项：单独归档到 daily/YYYY-MM-DD.json（历史不可覆盖）。
    # 任何异常都不许影响上面那份健康快照 —— 日志格式变了也得让 status.json 照写。
    crawl_day = (datetime.utcnow() + CST).strftime("%Y-%m-%d")
    try:
        crawl = collect_baidu_daily(crawl_day)
        crawl_path = write_daily(crawl)
        payload["baidu_crawl"] = {
            "date": crawl_day,
            "daily_file": crawl_path,
            "counts": crawl["counts"],
            "bursts": crawl["bursts"],
            "content_urls": len(crawl["content_urls"]),
            "hubs": crawl["hubs"],
            "dropped": crawl["dropped"],
        }
        # 顺带补全昨天（当日文件在次日第一次运行时被重算成完整一天）
        backfilled = []
        for offset in range(1, BAIDU_DAILY_BACKFILL_DAYS + 1):
            past_day = (datetime.utcnow() + CST - timedelta(days=offset)).strftime("%Y-%m-%d")
            try:
                write_daily(collect_baidu_daily(past_day))
                backfilled.append(past_day)
            except Exception as error:  # noqa: BLE001
                backfilled.append(past_day + ":error:" + str(error))
        payload["baidu_crawl"]["backfilled"] = backfilled
    except Exception as error:  # noqa: BLE001 — 归档失败不能拖垮健康检查
        payload["baidu_crawl"] = {"date": crawl_day, "error": str(error)}

    save_json(STATUS_FILE, payload)
    print(json.dumps(payload, ensure_ascii=True, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
