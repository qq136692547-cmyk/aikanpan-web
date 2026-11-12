#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""IndexNow 提交：把新 URL 主动通知 Bing / Yandex / Seznam。

背景：百度对这个站给的是每天 0-1 次抓取，收录 1 页、展现 0。
Bing 是现存最实在的流量来源（29 次点击/天），而 IndexNow 是它官方支持的
「主动告知」协议——免费、无需账号、无需 API key，只要站点根目录放一个
校验文件。

设计：
  - 拉 sitemap 得到全部 URL
  - 与本地 state 里已提交的对比，只提交新增的
  - 首次运行会把全部 URL 一次提交（IndexNow 单次上限 10000）
  - 同一 URL 不重复提交（协议建议不要频繁重复）

部署：/opt/aikanpan-ops/bin/indexnow_submit.py
定时：aikanpan-indexnow.timer，每天 00:30 Asia/Shanghai

兼容 Python 3.6.8：使用 urllib.request，不用 http.client 新接口。
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

CST = timezone(timedelta(hours=8))

HOST = "aikanpan.top"
KEY = "fdf37a8bde9e701c27d9e7f3e3002fe2"
KEY_LOCATION = "https://%s/%s.txt" % (HOST, KEY)
SITEMAP_URL = "https://%s/sitemap.xml" % HOST
ENDPOINT = "https://api.indexnow.org/indexnow"

STATE_FILE = "/var/lib/aikanpan-indexnow/state.json"
LOG_DIR = "/var/lib/aikanpan-indexnow"
MAX_URLS_PER_RUN = 1000  # 协议上限 10000，留足余量


def http_get(url, timeout=25):
    request = urllib.request.Request(url, headers={"User-Agent": "aikanpan-indexnow/1.0"})
    response = urllib.request.urlopen(request, timeout=timeout)
    try:
        body = response.read().decode("utf-8", "replace")
        return response.getcode(), body
    finally:
        response.close()


def http_post_json(url, payload, timeout=30):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json; charset=utf-8"}
    )
    try:
        response = urllib.request.urlopen(request, timeout=timeout)
        try:
            return response.getcode(), response.read().decode("utf-8", "replace")[:300]
        finally:
            response.close()
    except urllib.error.HTTPError as error:
        try:
            return error.code, error.read().decode("utf-8", "replace")[:300]
        finally:
            error.close()
    except Exception as error:  # noqa: BLE001
        return -1, str(error)


def load_state():
    try:
        with open(STATE_FILE, "r") as handle:
            return json.load(handle)
    except Exception:  # noqa: BLE001
        return {"submitted": {}, "runs": []}


def save_state(state):
    if not os.path.isdir(LOG_DIR):
        try:
            os.makedirs(LOG_DIR, 0o700)
        except Exception:  # noqa: BLE001
            pass
    with open(STATE_FILE, "w") as handle:
        json.dump(state, handle, ensure_ascii=False, indent=1)


def parse_sitemap(xml):
    return re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml)


def main():
    state = load_state()
    submitted = state.get("submitted") or {}

    try:
        status, xml = http_get(SITEMAP_URL)
    except Exception as error:  # noqa: BLE001
        print("sitemap 拉取失败: %s" % error)
        return 1

    if status != 200:
        print("sitemap 返回 HTTP %s" % status)
        return 1

    all_urls = [u for u in parse_sitemap(xml) if u.startswith("https://")]
    if not all_urls:
        print("sitemap 里没解析到 URL")
        return 1

    new_urls = [u for u in all_urls if u not in submitted]
    if not new_urls:
        print("无新增 URL（sitemap=%d，已提交=%d）" % (len(all_urls), len(submitted)))
        return 0

    batch = new_urls[:MAX_URLS_PER_RUN]
    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": batch,
    }
    code, body = http_post_json(ENDPOINT, payload)

    now = datetime.now(CST).strftime("%Y-%m-%dT%H:%M:%S%z")
    result = {
        "at": now,
        "count": len(batch),
        "http": code,
        "body": body,
        "sitemap_total": len(all_urls),
    }

    if code in (200, 202):
        for url in batch:
            submitted[url] = now
        state["submitted"] = submitted
        runs = state.get("runs") or []
        runs.append(result)
        state["runs"] = runs[-30:]
        save_state(state)
        print("提交成功 HTTP %s，本次 %d 条，累计 %d / sitemap %d"
              % (code, len(batch), len(submitted), len(all_urls)))
        return 0

    print("提交失败 HTTP %s: %s" % (code, body))
    runs = state.get("runs") or []
    runs.append(result)
    state["runs"] = runs[-30:]
    save_state(state)
    return 2


if __name__ == "__main__":
    sys.exit(main())
